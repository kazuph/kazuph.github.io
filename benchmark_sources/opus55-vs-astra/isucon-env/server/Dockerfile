# ISUCON14 single-server image (MySQL + nginx + Go webapp + matcher) for Apple container
FROM golang:1.23 AS go
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      mysql-server nginx curl ca-certificates gzip procps psmisc sudo vim less git make \
      && rm -rf /var/lib/apt/lists/*
COPY --from=go /usr/local/go /usr/local/go
ENV PATH=/usr/local/go/bin:/home/isucon/go/bin:$PATH GOPATH=/home/isucon/go GOTOOLCHAIN=local
RUN useradd -m -s /bin/bash isucon && echo 'isucon ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/isucon
COPY env.sh /home/isucon/env.sh
COPY isuride.conf /etc/nginx/sites-available/isuride.conf
RUN rm -f /etc/nginx/sites-enabled/default && ln -s /etc/nginx/sites-available/isuride.conf /etc/nginx/sites-enabled/isuride.conf
COPY isu-start isu-restart /usr/local/bin/
RUN chmod +x /usr/local/bin/isu-start /usr/local/bin/isu-restart && chown -R isucon:isucon /home/isucon && chmod 755 /home/isucon
EXPOSE 80
CMD ["/usr/local/bin/isu-start"]
