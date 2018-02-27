module.exports = {
  maxsize: 2097152,
  error: {
  	name: 'error',
  	level: 'info', // 'verbose' || 'custom' || 'none'
    console: true,
    timestamp: true,
    format: 'json', // 'simple' || 
    path: './_logs/errors'
  },
  provider: {
    name: 'provider',
    level: 'info', // 'verbose' || 'custom' || 'none'
    console: false,
    timestamp: true,
    format: 'json', // 'simple' || 
    path: './_logs/provider'
  },
  listener: {
  	name: 'listener',
  	level: 'info', // 'verbose' || 'custom' || 'none'
    console: true,
    timestamp: true,
    format: 'simple', // 'simple' || 
    path: './_logs/listener'
  },
  debugger: {
  	name: 'debugger',
  	level: 'none', // 'verbose' || 'custom' || 'none'
    console: false,
    timestamp: true,
    format: 'json', // 'simple' || 
    path: './_logs/debugger'
  },
  plugins: {
    name: 'plugins',
    level: 'none', // 'verbose' || 'custom' || 'none'
    console: false,
    timestamp: true,
    format: 'simple', // 'simple' || 
    path: './_logs/plugins'
  }
}