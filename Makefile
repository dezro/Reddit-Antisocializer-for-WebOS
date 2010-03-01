DEFAULT_EXCLUDE_PATHS = ./bin
DEFAULT_EXCLUDE_NAMES = .\* Makefile LICENSE README

PROJECT_ID := $(shell getjson -f appinfo.json id)
PROJECT_VERSION := $(shell getjson -f appinfo.json version)

IPK_FILE := bin/$(PROJECT_ID)_$(PROJECT_VERSION)_all.ipk

NOT_PATH := $(foreach path,$(DEFAULT_EXCLUDE_PATHS),-not -path $(path)/\* -not -path $(path))
NOT_NAME := $(foreach name,$(DEFAULT_EXCLUDE_NAMES),-not -name $(name))
ALL_SOURCE := $(shell find . $(NOT_NAME) $(NOT_PATH) | sed -e 's/ /\\ /g')

all: ipk

ipk: $(IPK_FILE)

install: $(IPK_FILE)
	palm-install $(IPK_FILE)

launch: install
	palm-launch -i $(PROJECT_ID)

monitor: install
	palm-worm $(PROJECT_ID) &
	palm-launch $(PROJECT_ID)

clean:
	rm -r bin

remove:
	palm-install -r $(PROJECT_ID)


$(IPK_FILE): $(ALL_SOURCE)
	mkdir -p bin
	palm-package --exclude=bin --exclude=Makefile --outdir=bin .
