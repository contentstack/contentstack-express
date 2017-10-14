[![Contentstack](https://www.contentstack.com/docs/static/images/contentstack.png)](https://www.built.io/products/contentstack/overview)

# Contentstack web application framework based on Express

## Install CLI

**Note: This version of Contentstack CLI & Contentstack Express can be used only for V3 stacks. Use CLI version 1.x, for V2 stacks.**

Run the following command in a Terminal or Command Prompt to globally install the latest version of Contentstack CLI on your system:
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
- [Website](https://www.built.io/products/contentstack/overview)
- [Official Documentation](https://www.contentstack.com//docs/tools-and-frameworks/web-framework-contentstack-express
)

### License
Copyright © 2012-2017 [Built.io](https://www.built.io/). All Rights Reserved.
