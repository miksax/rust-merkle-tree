import test from 'ava';
import { randomAddress } from './generator.js';
import { ReceiptMerkleTreeOld } from './old/ReceiptMerkleTree.js';
import { ReceiptMerkleTreeNew } from './new/ReceiptMerkleTreeNew.js';

test('Test ReceiptMerkleTree compatibility', (t) => {
    const contract = randomAddress();
    const transactionId1 = '0xaaa0';
    const transactionId2 = '0xaaab';
    const transactionId3 = '0xaaac';
    const transactionId4 = '0xaaad';
    const transactionId5 = '0xaaae';
    const transactionId6 = '0xaaaf';
    const transactionId7 = '0xaaa1';
    const transactionId8 = '0xaaa2';

    const merkleOld = new ReceiptMerkleTreeOld();
    const merkleNew = new ReceiptMerkleTreeNew();

    merkleOld.updateValue(contract, transactionId1, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    merkleOld.updateValue(contract, transactionId2, new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9]));
    merkleOld.updateValue(contract, transactionId3, new Uint8Array([4, 5, 6, 7, 8, 9, 10, 11]));
    merkleOld.updateValue(contract, transactionId4, new Uint8Array([5, 6, 7, 8, 9, 10, 11, 12]));
    merkleOld.updateValue(contract, transactionId5, new Uint8Array([6, 7, 8, 9, 10, 11, 12, 13]));
    merkleOld.updateValue(contract, transactionId6, new Uint8Array([7, 8, 9, 10, 11, 12, 13, 14]));
    merkleOld.updateValue(contract, transactionId7, new Uint8Array([8, 9, 10, 11, 12, 13, 14, 15]));
    merkleOld.updateValue(
        contract,
        transactionId8,
        new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]),
    );

    merkleNew.updateValue(contract, transactionId1, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    merkleNew.updateValue(contract, transactionId2, new Uint8Array([2, 3, 4, 5, 6, 7, 8, 9]));
    merkleNew.updateValue(contract, transactionId3, new Uint8Array([4, 5, 6, 7, 8, 9, 10, 11]));
    merkleNew.updateValue(contract, transactionId4, new Uint8Array([5, 6, 7, 8, 9, 10, 11, 12]));
    merkleNew.updateValue(contract, transactionId5, new Uint8Array([6, 7, 8, 9, 10, 11, 12, 13]));
    merkleNew.updateValue(contract, transactionId6, new Uint8Array([7, 8, 9, 10, 11, 12, 13, 14]));
    merkleNew.updateValue(contract, transactionId7, new Uint8Array([8, 9, 10, 11, 12, 13, 14, 15]));
    merkleNew.updateValue(
        contract,
        transactionId8,
        new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16]),
    );

    merkleOld.generateTree();
    merkleNew.generateTree();

    const proofOld = merkleOld.getProofs();
    const proofNew = merkleNew.getProofs();

    t.deepEqual(merkleOld!.values, merkleNew!.values);
    t.deepEqual(proofOld, proofNew);
});
