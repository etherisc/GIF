 #!/usr/bin/env bash

set -e

for package in `ls -d gif-microservices/* gif-contracts gif-cli`
do
  echo "Install dependencies for $package and update locks for deploy"
  (
    cd $package
    rm -rf node_modules
    rm -f package-lock.json
    npm install
    git add package-lock.json
  )
done
