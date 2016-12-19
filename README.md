[![Built.io Contentstack](https://contentstackdocs.built.io/static/images/logo.png)](http://contentstack.io)

# Built.io Contentstack web application framework based on Express

## Install CLI
Run the following command in a Terminal or Command Prompt to globally install the latest version of Built.io Contentstack CLI on your system:
```bash
$ npm install -g contentstack-cli
```
​*You might need administrator privileges to perform this installation.*​

## Connect to a Stack
Start building your web application by connecting it to your existing stack.

Navigate to your workspace in the terminal, and run the 'connect' command.
```bash
$ contentstack connect
```
This will prompt you to enter the stack's api key and access token. You can find these details in the Settings > Stack page.

```bash
Enter your stack api key: {API_KEY}
Enter your stack access token: {ACCESS_TOKEN}
```

This will validate the stack. Once validated, you will be prompted to enter the project root directory and select one of the publishing environments of your stack.

```bash
Enter the name of the directory to contain the project: (my-site)
Select the publishing environment:
1. development
```
This will automatically configure your project for the selected publishing environment along with basic theme for the website.

### Run the Site
Navigate to this folder and start the site.
```bash
$ cd my-site
$ npm start
```

## Links
- [Website](http://contentstack.io/)
- [Official Documentation](http://contentstackdocs.built.io/developer/web/quickstart)

### License
Copyright © 2012-2016 [Built.io](https://www.built.io/). All Rights Reserved.
