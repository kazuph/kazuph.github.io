#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "date"
require "fileutils"
require "json"
require "net/http"
require "uri"
require "yaml"

ROOT = File.expand_path("..", __dir__)
POSTS_DIR = File.join(ROOT, "_posts", "zenn")
INDEX_OUTPUT = File.join(ROOT, "_data", "zenn_articles.yml")
LIST_API_URL = "https://zenn.dev/api/articles?username=kazuph&order=latest"

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

def post_frontmatter(article)
  slug = article.fetch("slug")
  published_at = DateTime.parse(article.fetch("publishedAt"))
  body_html = article.fetch("bodyHtml")
  topics = Array(article["topics"]).map { |topic| topic.fetch("name") }

  {
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
end

list = JSON.parse(fetch(LIST_API_URL)).fetch("articles")
FileUtils.rm_rf(POSTS_DIR)
FileUtils.mkdir_p(POSTS_DIR)

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
