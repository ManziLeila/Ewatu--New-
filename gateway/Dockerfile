FROM nginx:alpine
RUN apk add --no-cache gettext
COPY gateway/nginx.conf.template /etc/nginx/nginx.conf.template
COPY gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
