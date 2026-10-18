import {expect,it} from 'vitest';
import {runReplay} from '../../examples/pump_shred_routes.js';
it('replays six real signed V0/V1 transactions twice without RPC',()=>expect(runReplay()).toBe(6));
