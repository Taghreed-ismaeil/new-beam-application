// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// The Express backend (with its own node_modules) lives inside this folder but
// is never part of the app bundle. Keeping Metro from crawling and watching it
// stops the dev server running out of file handles on Windows ("EMFILE: too
// many open files"), which broke bundling after a while.
const backendDir = path.join(__dirname, "backend").replace(/[/\\]/g, "[/\\\\]");
const blockBackend = new RegExp(`^${backendDir}[/\\\\].*`);

const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  blockBackend,
];

module.exports = config;
