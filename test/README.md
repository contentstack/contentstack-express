#To test follow the steps

 1. set the content directory in the config(all.js)
 2. make sure you have _content from https://www.dropbox.com/s/uw445vtum6k6r73/Unit-Test-Content.zip link and v2I/O is configured in the all.json
 3. run the test cases using following


    npm test

#Built.io Contentstack Configuration
    indexes: {
        "reference": ["title"],
        "other_reference": ["title"]
    }

    "contentstack": {
	  "api_key": "bltf9cdecd012ea43cc",
	  "access_token": "blte6d3fe16e678f835096754b7"
	}

#Run the tests
 
npm test (to write output to file just follow | tap-json > path-to-file/filename.json)