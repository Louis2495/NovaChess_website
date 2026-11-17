import test from 'node:test';import assert from 'node:assert/strict';
import {screenName,isGeneratedUsername} from '../../src/lib/screenName.ts';
test('public labels prefer screen names and never reveal generated handles',()=>{
 assert.equal(screenName({screen_name:'Knight Owl',username:'player_h54tygv'}),'Knight Owl');
 assert.equal(screenName({username:'player_h54tygv'}),'Player');assert.equal(screenName({name:'PLAYER_hidden'},'Opponent'),'Opponent');
 assert.equal(screenName({username:'Legacy Knight'}),'Legacy Knight');assert.equal(screenName({screen_name:'player_fake',username:'player_hidden'}),'Player');assert.equal(isGeneratedUsername(' Player_generated '),true);
});
