import test from 'ava'

import { Address, BufferHelper, MemorySlotData, MemorySlotPointer } from '@btc-vision/bsi-binary';
import crypto from 'crypto';
import { MerkleTreeOld, MerkleTreeNew } from './MerkleTree.js';

export class StateMerkleTreeOld extends MerkleTreeOld<MemorySlotPointer, MemorySlotData<bigint>> {
    public static TREE_TYPE: [string, string] = ['bytes32', 'bytes32'];

    constructor() {
        super(StateMerkleTreeOld.TREE_TYPE);
    }

    public static encodePointerBuffer(contract: string, pointer: Uint8Array | Buffer): Buffer {
        const hash = crypto.createHash('sha256');
        hash.update(contract);
        hash.update(pointer);

        return hash.digest();
    }

    public getProofs(): Map<Address, Map<MemorySlotPointer, string[]>> {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        this.validate();

        const proofs = new Map<Address, Map<MemorySlotPointer, string[]>>();
        for (const [address, val] of this.values.entries()) {
            for (const [key, value] of val.entries()) {
                const pointer = this.encodePointer(address, key);
                const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

                const proof: string[] = this.tree.getProof([pointer, valueAsBuffer]);
                if (!proof || !proof.length) {
                    throw new Error(`Proof not found for ${pointer.toString('hex')}`);
                }

                if (!proofs.has(address)) {
                    proofs.set(address, new Map());
                }

                const proofMap = proofs.get(address);
                if (proofMap) {
                    proofMap.set(key, proof);
                }
            }
        }

        return proofs;
    }

    /** We have to replace the value of the given address and key with the new value */
    public updateValues(
        address: Address,
        val: Map<MemorySlotPointer, MemorySlotData<bigint>>,
    ): void {
        this.ensureAddress(address);

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        let valueChanged: boolean = false;
        for (const [key, value] of val) {
            const currentValue = map.get(key);
            if (currentValue && currentValue === value) {
                continue;
            }

            map.set(key, value);
            valueChanged = true;
        }

        this.valueChanged = valueChanged;
    }

    public updateValue(
        address: Address,
        key: MemorySlotPointer,
        val: MemorySlotData<bigint>,
    ): void {
        if (this.frozen) {
            throw new Error('Merkle tree is frozen, cannot update value');
        }

        this.ensureAddress(address);

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        const currentValue = map.get(key);
        if (currentValue && currentValue === val) {
            return;
        }

        map.set(key, val);
        this.valueChanged = true;
    }

    public getValue(address: string, key: MemorySlotPointer): MemorySlotData<bigint> | undefined {
        if (!this.values.has(address)) {
            return;
        }

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        return map.get(key);
    }

    public getValueWithProofs(
        address: Address,
        key: MemorySlotPointer,
    ): [Uint8Array, string[]] | undefined {
        const value = this.getValue(address, key);
        if (!value) {
            return undefined;
        }

        const uint8Array = BufferHelper.valueToUint8Array(value);
        const valueAsBuffer = Buffer.from(uint8Array);
        const pointer = this.encodePointer(address, key);

        if (!this.tree) {
            return [uint8Array, []];
        }

        this.validate();

        const proof: string[] = this.tree.getProof([pointer, valueAsBuffer]);
        if (!proof || !proof.length) {
            throw new Error(`Proof not found for ${pointer.toString('hex')}`);
        }

        return [uint8Array, proof];
    }

    public getValuesWithProofs(
        address: string,
    ): Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]> {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        this.validate();

        const proofs = new Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>();
        if (!this.values.has(address)) {
            return proofs;
        }

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        for (const [key, value] of map.entries()) {
            const pointer = this.encodePointer(address, key);
            const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

            const proof: string[] = this.tree.getProof([pointer, valueAsBuffer]);

            if (!proof || !proof.length) {
                throw new Error(`Proof not found for pointer ${pointer.toString('hex')}`);
            }

            proofs.set(key, [value, proof]);
        }

        return proofs;
    }

    public getEverythingWithProofs():
        | Map<string, Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>>
        | undefined {
        if (!this.tree) {
            return;
        }

        this.validate();

        const proofs = new Map<
            string,
            Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>
        >();

        for (const [address] of this.values.entries()) {
            const map = this.getValuesWithProofs(address);

            proofs.set(address, map);
        }

        return proofs;
    }

    public encodePointer(contract: string, pointer: bigint): Buffer {
        return StateMerkleTreeOld.encodePointerBuffer(
            contract,
            BufferHelper.pointerToUint8Array(pointer),
        );
    }

    public getValues(): [Buffer, Buffer][] {
        const entries: [Buffer, Buffer][] = [];

        for (const [address, map] of this.values.entries()) {
            for (const [key, value] of map.entries()) {
                const pointer = this.encodePointer(address, key);
                const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

                entries.push([pointer, valueAsBuffer]);
            }
        }

        return entries;
    }

    protected getDummyValues(): Map<string, Map<MemorySlotPointer, MemorySlotData<bigint>>> {
        const dummyValues = new Map<string, Map<MemorySlotPointer, MemorySlotData<bigint>>>();
        const dummyMap = new Map<MemorySlotPointer, MemorySlotData<bigint>>();

        // Ensure minimum tree requirements
        dummyMap.set(1n, 1n);
        dummyMap.set(2n, 2n);

        // Add dummy values for the contract
        dummyValues.set(this.DUMMY_ADDRESS_NON_EXISTENT, dummyMap);

        return dummyValues;
    }

    private ensureAddress(address: Address): void {
        if (!this.values.has(address)) {
            this.values.set(address, new Map());
        }
    }
}

export class StateMerkleTreeNew extends MerkleTreeNew<MemorySlotPointer, MemorySlotData<bigint>> {
    public static TREE_TYPE: [string, string] = ['bytes32', 'bytes32'];

    constructor() {
        super(StateMerkleTreeNew.TREE_TYPE);
    }

    public static encodePointerBuffer(contract: string, pointer: Uint8Array | Buffer): Buffer {
        const hash = crypto.createHash('sha256');
        hash.update(contract);
        hash.update(pointer);

        return hash.digest();
    }

    public getProofs(): Map<Address, Map<MemorySlotPointer, string[]>> {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }


        const proofs = new Map<Address, Map<MemorySlotPointer, string[]>>();
        for (const [address, val] of this.values.entries()) {
            for (const [key, value] of val.entries()) {
                const pointer = this.encodePointer(address, key);
                const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

                const proof: string[] = this.getProofHashes([pointer, valueAsBuffer])
                if (!proof || !proof.length) {
                    throw new Error(`Proof not found for ${pointer.toString('hex')}`);
                }

                if (!proofs.has(address)) {
                    proofs.set(address, new Map());
                }

                const proofMap = proofs.get(address);
                if (proofMap) {
                    proofMap.set(key, proof);
                }
            }
        }

        return proofs;
    }

    /** We have to replace the value of the given address and key with the new value */
    public updateValues(
        address: Address,
        val: Map<MemorySlotPointer, MemorySlotData<bigint>>,
    ): void {
        this.ensureAddress(address);

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        let valueChanged: boolean = false;
        for (const [key, value] of val) {
            const currentValue = map.get(key);
            if (currentValue && currentValue === value) {
                continue;
            }

            map.set(key, value);
            valueChanged = true;
        }

        this.valueChanged = valueChanged;
    }

    public updateValue(
        address: Address,
        key: MemorySlotPointer,
        val: MemorySlotData<bigint>,
    ): void {
        if (this.frozen) {
            throw new Error('Merkle tree is frozen, cannot update value');
        }

        this.ensureAddress(address);

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        const currentValue = map.get(key);
        if (currentValue && currentValue === val) {
            return;
        }

        map.set(key, val);
        this.valueChanged = true;
    }

    public getValue(address: string, key: MemorySlotPointer): MemorySlotData<bigint> | undefined {
        if (!this.values.has(address)) {
            return;
        }

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        return map.get(key);
    }

    public getValueWithProofs(
        address: Address,
        key: MemorySlotPointer,
    ): [Uint8Array, string[]] | undefined {
        const value = this.getValue(address, key);
        if (!value) {
            return undefined;
        }

        const uint8Array = BufferHelper.valueToUint8Array(value);
        const valueAsBuffer = Buffer.from(uint8Array);
        const pointer = this.encodePointer(address, key);

        if (!this.tree) {
            return [uint8Array, []];
        }

        const proof: string[] = this.getProofHashes([pointer, valueAsBuffer])
        if (!proof || !proof.length) {
            throw new Error(`Proof not found for ${pointer.toString('hex')}`);
        }

        return [uint8Array, proof];
    }

    public getValuesWithProofs(
        address: string,
    ): Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]> {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        const proofs = new Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>();
        if (!this.values.has(address)) {
            return proofs;
        }

        const map = this.values.get(address);
        if (!map) {
            throw new Error('Map not found');
        }

        for (const [key, value] of map.entries()) {
            const pointer = this.encodePointer(address, key);
            const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

            const proof: string[] = this.getProofHashes([pointer, valueAsBuffer]);

            if (!proof || !proof.length) {
                throw new Error(`Proof not found for pointer ${pointer.toString('hex')}`);
            }

            proofs.set(key, [value, proof]);
        }

        return proofs;
    }

    public getEverythingWithProofs():
        | Map<string, Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>>
        | undefined {
        if (!this.tree) {
            return;
        }

        const proofs = new Map<
            string,
            Map<MemorySlotPointer, [MemorySlotData<bigint>, string[]]>
        >();

        for (const [address] of this.values.entries()) {
            const map = this.getValuesWithProofs(address);

            proofs.set(address, map);
        }

        return proofs;
    }

    public encodePointer(contract: string, pointer: bigint): Buffer {
        return StateMerkleTreeNew.encodePointerBuffer(
            contract,
            BufferHelper.pointerToUint8Array(pointer),
        );
    }

    public getValues(): [Buffer, Buffer][] {
        const entries: [Buffer, Buffer][] = [];

        for (const [address, map] of this.values.entries()) {
            for (const [key, value] of map.entries()) {
                const pointer = this.encodePointer(address, key);
                const valueAsBuffer = Buffer.from(BufferHelper.valueToUint8Array(value));

                entries.push([pointer, valueAsBuffer]);
            }
        }

        return entries;
    }

    protected getDummyValues(): Map<string, Map<MemorySlotPointer, MemorySlotData<bigint>>> {
        const dummyValues = new Map<string, Map<MemorySlotPointer, MemorySlotData<bigint>>>();
        const dummyMap = new Map<MemorySlotPointer, MemorySlotData<bigint>>();

        // Ensure minimum tree requirements
        dummyMap.set(1n, 1n);
        dummyMap.set(2n, 2n);

        // Add dummy values for the contract
        dummyValues.set(this.DUMMY_ADDRESS_NON_EXISTENT, dummyMap);

        return dummyValues;
    }

    private ensureAddress(address: Address): void {
        if (!this.values.has(address)) {
            this.values.set(address, new Map());
        }
    }
}

test('Test StateMerkleTree compatibility', (t) => {
    const cnt = 1

    let merkleOld = null
    let proofOld = null
    let start = new Date()
    for (let i = 0; i < cnt; i++) {
        merkleOld = new StateMerkleTreeOld()
        merkleOld.updateValue("abcd1", 1n, 1n)
        merkleOld.updateValue("abcd2", 2n, 2n)
        merkleOld.updateValue("abcd1", 3n, 3n)
        merkleOld.updateValue("abcd2", 4n, 4n)
        merkleOld.generateTree()
        proofOld = merkleOld.getProofs()
    }
    const oldPerf = (new Date()).getTime() - start.getTime()

    let merkleNew = null
    let proofNew = null
    start = new Date()
    for (let i = 0; i < cnt; i++) {
        merkleNew = new StateMerkleTreeNew()
        merkleNew.updateValue("abcd1", 1n, 1n)
        merkleNew.updateValue("abcd2", 2n, 2n)
        merkleNew.updateValue("abcd1", 3n, 3n)
        merkleNew.updateValue("abcd2", 4n, 4n)
        merkleNew.generateTree()
        proofNew = merkleNew.getProofs()
    }
    const newPerf = (new Date()).getTime() - start.getTime()
    console.log("Perf", newPerf, oldPerf)
    t.true(newPerf < oldPerf)
    t.deepEqual(merkleOld!.values, merkleNew!.values)
    t.deepEqual(proofOld, proofNew)
    t.true(true)
    t.true(true)
})