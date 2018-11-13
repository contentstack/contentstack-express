const fs = require('fs');
const path = require('path');
exports.readFile = function(path) {
  try {
    if (fs.existsSync(path)) {
      return JSON.parse(fs.readFileSync(path));
    } else {
      return {};
    }
  } catch (error) {
    throw error;
  }
};
exports.getData = function() {
  var data = {
    entry: {
      title: 'Custom entry 1',
      uid: 'custom_1',
      name: 'John',
      last: 'Doe',
      age: 25,
      tags: ['a', 'b'],
      group: {
        gender: 'm',
        occupation: 'worker',
        height: 1.76,
        alive: true
      }
    },
    content_type: {
      title: 'Beta',
      uid: 'beta',
      schema: [{
          "display_name": "Title",
          "uid": "title",
          "data_type": "text",
          "mandatory": true,
          "unique": true,
          "field_metadata": {
            "_default": true
          },
          "multiple": false
				},
        {
          "data_type": "text",
          "display_name": "Rich text editor",
          "uid": "rich_text_editor",
          "field_metadata": {
            "allow_rich_text": true,
            "description": "",
            "multiline": false,
            "rich_text_type": "advanced"
          },
          "multiple": false,
          "mandatory": false,
          "unique": false
				},
        {
          "data_type": "text",
          "display_name": "Markdown",
          "uid": "markdown",
          "field_metadata": {
            "description": "",
            "markdown": true
          },
          "multiple": false,
          "mandatory": false,
          "unique": false
				}
			]
    }
  };
  return data;
};