#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "date"
require "fileutils"
require "json"
require "net/http"
require "open3"
require "uri"
require "yaml"

ROOT = File.expand_path("..", __dir__)
POSTS_DIR = File.join(ROOT, "_posts", "zenn")
INDEX_OUTPUT = File.join(ROOT, "_data", "zenn_articles.yml")
OG_OUTPUT_DIR = File.join(ROOT, "images", "og", "zenn")
AVATAR_IMAGE = File.join(ROOT, "images", "kazuph-avatar.png")
LIST_API_URL = "https://zenn.dev/api/articles?username=kazuph&order=latest"
IMAGE_REQUEST_TIMEOUT = 5
IMAGE_REDIRECT_LIMIT = 5
SKIPPED_IMAGE_HOSTS = ["embed.zenn.studio"].freeze
OG_TITLE_LINE_LENGTH = 20
OG_TITLE_MAX_LINES = 3

def fetch(uri, limit = 5)
  raise "too many redirects: #{uri}" if limit <= 0

  response = Net::HTTP.get_response(URI(uri))
  return fetch(response["location"], limit - 1) if response.is_a?(Net::HTTPRedirection) && response["location"]

  raise "GET #{uri} failed: #{response.code} #{response.message}" unless response.is_a?(Net::HTTPSuccess)

  response.body
end

def next_data(html, url)
  match = html.match(%r{<script\b[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>}m)
  raise "missing __NEXT_DATA__: #{url}" unless match

  JSON.parse(CGI.unescapeHTML(match[1]))
end

def article_payload(slug)
  url = "https://zenn.dev/kazuph/articles/#{slug}"
  props = next_data(fetch(url), url).fetch("props").fetch("pageProps")
  props.fetch("article").merge("topics" => props.fetch("topics", []))
end

def description_from_html(html)
  html
    .gsub(%r{<pre.*?</pre>}m, "")
    .gsub(/<[^>]+>/, "")
    .gsub(/\s+/, " ")
    .strip
    .slice(0, 140)
end

def image_sources_from_html(html)
  html.scan(%r{<img\b[^>]*\bsrc=["']([^"']+)["']}i).flatten
end

def normalize_image_url(url)
  value = url.to_s.strip
  return nil if value.empty? || value.start_with?("data:", "blob:")

  value = "https:#{value}" if value.start_with?("//")
  uri = URI(value)
  return nil unless uri.is_a?(URI::HTTP) && uri.host
  return nil if SKIPPED_IMAGE_HOSTS.include?(uri.host)

  uri.to_s
rescue URI::InvalidURIError
  nil
end

def image_response?(response, uri)
  return false unless response.is_a?(Net::HTTPSuccess)

  content_type = response["content-type"].to_s.downcase
  return true if content_type.start_with?("image/")

  uri.path.match?(/\.(?:png|jpe?g|gif|webp|avif)\z/i)
end

def image_reachable?(url, limit = IMAGE_REDIRECT_LIMIT)
  normalized_url = normalize_image_url(url)
  return false unless normalized_url
  raise "too many redirects while checking image: #{url}" if limit <= 0

  uri = URI(normalized_url)
  Net::HTTP.start(
    uri.host,
    uri.port,
    use_ssl: uri.scheme == "https",
    open_timeout: IMAGE_REQUEST_TIMEOUT,
    read_timeout: IMAGE_REQUEST_TIMEOUT
  ) do |http|
    head = Net::HTTP::Head.new(uri.request_uri)
    head["User-Agent"] = "kazuph.github.io image checker"
    response = http.request(head)

    if response.is_a?(Net::HTTPRedirection) && response["location"]
      return image_reachable?(URI.join(uri, response["location"]).to_s, limit - 1)
    end

    return true if image_response?(response, uri)
    return false unless response.is_a?(Net::HTTPMethodNotAllowed) || response["content-type"].to_s.empty?

    get = Net::HTTP::Get.new(uri.request_uri)
    get["User-Agent"] = "kazuph.github.io image checker"
    get["Range"] = "bytes=0-0"
    response = http.request(get)

    if response.is_a?(Net::HTTPRedirection) && response["location"]
      return image_reachable?(URI.join(uri, response["location"]).to_s, limit - 1)
    end

    image_response?(response, uri)
  end
rescue StandardError
  false
end

def body_image_candidates(body_html)
  image_sources_from_html(body_html)
    .filter_map { |url| normalize_image_url(url) }
    .uniq
end

def first_usable_body_image(body_html)
  body_image_candidates(body_html).find { |url| image_reachable?(url) }
end

def magick_command
  ENV.fetch("MAGICK_COMMAND", "magick")
end

def ensure_magick!
  _out, _err, status = Open3.capture3(magick_command, "-version")
  return if status.success?

  raise "ImageMagick is required to generate article OGP images. Run inside nix develop."
end

def magick_fonts
  out, _err, status = Open3.capture3(magick_command, "-list", "font")
  return "" unless status.success?

  out
end

def preferred_font
  fonts = magick_fonts
  [
    "Noto-Sans-CJK-JP-Bold",
    "Noto-Sans-CJK-JP",
    "Hiragino-Sans-W6",
    "Apple-SD-Gothic-Neo-Bold",
    "DejaVu-Sans-Bold"
  ].find { |font| fonts.include?("Font: #{font}") }
end

def wrapped_og_title(title)
  safe_title = title.tr("%", "％")
  max_length = OG_TITLE_LINE_LENGTH * OG_TITLE_MAX_LINES
  safe_title = "#{safe_title[0, max_length - 1]}..." if safe_title.length > max_length
  safe_title.scan(/.{1,#{OG_TITLE_LINE_LENGTH}}/m).join("\n")
end

def generated_og_path(slug)
  File.join(OG_OUTPUT_DIR, "#{slug}.png")
end

def generated_og_url(slug)
  "/images/og/zenn/#{slug}.png"
end

def generate_article_og!(article)
  ensure_magick!
  FileUtils.mkdir_p(OG_OUTPUT_DIR)

  slug = article.fetch("slug")
  output_path = generated_og_path(slug)
  title = wrapped_og_title(article.fetch("title"))
  published_at = DateTime.parse(article.fetch("publishedAt")).strftime("%Y-%m-%d")
  font_args = preferred_font ? ["-font", preferred_font] : []

  command = [
    magick_command,
    "-size", "1200x630", "xc:#f7fbff",
    "-fill", "#ffffff", "-stroke", "#d7e7f5", "-strokewidth", "3",
    "-draw", "roundrectangle 80,70 1120,560 28,28",
    "-fill", "#174a7c", "-stroke", "none",
    "-draw", "rectangle 80,70 96,560",
    "(", AVATAR_IMAGE, "-resize", "118x118", ")",
    "-geometry", "+150+125", "-composite",
    "(", "-background", "none", *font_args, "-fill", "#0f172a", "-pointsize", "42",
    "-size", "760x245", "caption:#{title}", ")",
    "-geometry", "+310+120", "-composite",
    "(", "-background", "none", *font_args, "-fill", "#344256", "-pointsize", "28",
    "-size", "820x90", "caption:#{published_at} / kazuph.log", ")",
    "-geometry", "+150+375", "-composite",
    "(", "-background", "none", *font_args, "-fill", "#174a7c", "-pointsize", "28",
    "-size", "820x60", "caption:kazuph.github.io", ")",
    "-geometry", "+150+465", "-composite",
    output_path
  ]

  _out, err, status = Open3.capture3(*command)
  raise "failed to generate OGP image for #{slug}: #{err}" unless status.success?

  generated_og_url(slug)
end

def post_frontmatter(article)
  slug = article.fetch("slug")
  published_at = DateTime.parse(article.fetch("publishedAt"))
  body_html = article.fetch("bodyHtml")
  topics = Array(article["topics"]).map { |topic| topic.fetch("name") }

  frontmatter = {
    "layout" => "post",
    "title" => article.fetch("title"),
    "description" => description_from_html(body_html),
    "date" => published_at.strftime("%Y-%m-%d %H:%M:%S %z"),
    "source" => "zenn",
    "source_url" => "https://zenn.dev/kazuph/articles/#{slug}",
    "canonical_url" => "https://zenn.dev/kazuph/articles/#{slug}",
    "zenn_slug" => slug,
    "zenn_type" => article.fetch("articleType"),
    "zenn_emoji" => article.fetch("emoji"),
    "tags" => topics,
    "imported_at" => Date.today.iso8601
  }
  image_url = first_usable_body_image(body_html) || generate_article_og!(article)
  frontmatter["image"] = image_url if image_url && !image_url.empty?
  frontmatter
end

list = JSON.parse(fetch(LIST_API_URL)).fetch("articles")
FileUtils.rm_rf(POSTS_DIR)
FileUtils.rm_rf(OG_OUTPUT_DIR)
FileUtils.mkdir_p(POSTS_DIR)
FileUtils.mkdir_p(OG_OUTPUT_DIR)

index_rows = []

list.each do |row|
  slug = row.fetch("slug")
  article = article_payload(slug)
  frontmatter = post_frontmatter(article)
  date = DateTime.parse(article.fetch("publishedAt")).strftime("%Y-%m-%d")
  output_path = File.join(POSTS_DIR, "#{date}-zenn-#{slug}.html")

  File.write(output_path, "#{frontmatter.to_yaml}---\n\n#{article.fetch("bodyHtml")}\n")

  index_rows << {
    "title" => article.fetch("title"),
    "url" => frontmatter.fetch("source_url"),
    "slug" => slug,
    "published_at" => article.fetch("publishedAt"),
    "updated_at" => article["bodyUpdatedAt"] || article["sourceRepoUpdatedAt"],
    "type" => article.fetch("articleType"),
    "emoji" => article.fetch("emoji"),
    "liked_count" => article.fetch("likedCount"),
    "bookmarked_count" => article.fetch("bookmarkedCount"),
    "topics" => Array(article["topics"]).map { |topic| topic.fetch("name") }
  }
end

File.write(INDEX_OUTPUT, index_rows.to_yaml)
puts "Fetched #{index_rows.size} public Zenn articles to #{POSTS_DIR}"
