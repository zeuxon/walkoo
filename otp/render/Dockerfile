FROM opentripplanner/opentripplanner:2.4.0

WORKDIR /opt/render

COPY otp/graph/otp-config.json /opt/render/default-otp-config.json

ENV PORT=8080
ENV OTP_BASE_DIR=/var/opentripplanner
ENV JAVA_OPTS=-Xmx1G

COPY otp/render/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENTRYPOINT ["/usr/local/bin/start.sh"]
