FROM alexd1971/testbase
ADD . /var/www/test
WORKDIR /var/www/test
RUN /usr/local/bin/npm install
RUN /usr/sbin/service postgresql start && su postgres -c '/usr/bin/pg_restore -d test test.backup'
CMD /sbin/my_init
EXPOSE 1337