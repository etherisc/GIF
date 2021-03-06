#!/usr/bin/env bash

purge=false
set -x

if [ $1 == "run" ]
then
  dc_command="up"
  dc_options="-d --remove-orphans"
  dc_project="--project-name $2"

elif [ $1 == "kill" ]
then
  dc_command="kill"
  dc_options=""
  dc_project="--project-name $2"

elif [ $1 == "purge" ]
then
  dc_command="down"
  dc_options="-v"
  dc_project="--project-name $2"
  purge=true

fi

if [ $2 == "ganache" ]
then
  dc_file="docker-compose-ganache.yml"

else
  dc_file="docker-compose-base.yml"

fi

cd ./gif-services/compose
echo docker-compose -f ./$dc_file $dc_project $dc_command $dc_options
docker-compose -f ./$dc_file $dc_project $dc_command $dc_options

if [ "$purge" = true ]
then
  sudo rm -rf ./volumes/$2_minio
  sudo rm -rf ./volumes/$2_postgresql
  sudo rm -rf ./volumes/$2_ganache
fi
