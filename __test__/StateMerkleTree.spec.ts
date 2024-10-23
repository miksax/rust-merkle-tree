import test from 'ava';
import { StateMerkleTreeOld } from './old/StateMerkleTree.js';
import { randomAddress } from './generator.js';
import { StateMerkleTreeNew } from './new/StateMerkleTreeNew.js';

test('Test StateMerkleTree compatibility', (t) => {
    const address1 = randomAddress();
    const address2 = randomAddress();
    const address3 = randomAddress();
    const address4 = randomAddress();

    const merkleOld = new StateMerkleTreeOld();
    const merkleNew = new StateMerkleTreeNew();

    merkleOld.updateValue(address1, 1n, 1n);
    merkleOld.updateValue(address2, 2n, 2n);
    merkleOld.updateValue(address3, 3n, 3n);
    merkleOld.updateValue(address4, 4n, 4n);
    merkleOld.generateTree();

    merkleNew.updateValue(address1, 1n, 1n);
    merkleNew.updateValue(address2, 2n, 2n);
    merkleNew.updateValue(address3, 3n, 3n);
    merkleNew.updateValue(address4, 4n, 4n);
    merkleNew.generateTree();

    const proofOld = merkleOld.getProofs();
    const proofNew = merkleNew.getProofs();

    t.deepEqual(merkleOld!.values, merkleNew!.values);
    t.deepEqual(proofOld, proofNew);
});
