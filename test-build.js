#!/usr/bin/env node
import { Claude, ToolManager, SessionStore, CLAUDE_TYPES } from './dist/index.js';

console.log('Claude:', Claude);
console.log('ToolManager:', ToolManager);
console.log('SessionStore:', SessionStore);
console.log('CLAUDE_TYPES:', CLAUDE_TYPES);

console.log('\n✓ Package built successfully!');
console.log('✓ All exports are accessible');