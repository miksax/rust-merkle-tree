import test from 'ava'

import { StandardMerkleTree } from '@btc-vision/merkle-tree'
import { MerkleTree, MerkleProof } from '..'
import { defaultAbiCoder } from '@ethersproject/abi'
import { arrayify as toBytes, hexlify as toHex, concat } from '@ethersproject/bytes'


export abstract class MerkleTreeOld<K, V> {
    protected tree: StandardMerkleTree<[Buffer, Buffer]> | undefined;
    public readonly values: Map<string, Map<K, V>> = new Map();

    protected valueChanged: boolean = false;
    protected frozen: boolean = false;

    protected readonly DUMMY_ADDRESS_NON_EXISTENT = 'bc1dead';

    private readonly MINIMUM_VALUES = 2; // To generate a tree, we need at least 2 values

    constructor(protected readonly treeType: [string, string]) { }

    get root(): string {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        return this.tree.root;
    }

    public static verify(
        root: string,
        type: [string, string],
        value: Buffer[] | Uint8Array[],
        proof: string[],
    ): boolean {
        return StandardMerkleTree.verify(root, type, value, proof);
    }

    public size(): number {
        return this.values.size;
    }

    public validate(): void {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        if (this.countValues() < this.MINIMUM_VALUES) {
            throw new Error('Not enough values to generate a tree');
        }

        this.tree.validate();
    }

    public abstract getValue(address: string, key: K): V | undefined;

    public abstract getValueWithProofs(
        address: string,
        key: K,
    ): [V | Uint8Array, string[]] | undefined;

    public hasTree(): boolean {
        return !!this.tree;
    }

    public generateTree(regeneratedIfValueChanged: boolean = true): void {
        if (this.frozen) {
            throw new Error('Merkle tree is frozen');
        }

        if (!this.values.size) {
            return;
        }

        if (this.tree && !this.valueChanged && !regeneratedIfValueChanged) {
            return;
        }

        const values = this.getValues();
        this.tree = StandardMerkleTree.of<[Buffer, Buffer]>(values, this.treeType, {
            sortLeaves: true,
        });

        this.valueChanged = false;
    }

    public abstract getValuesWithProofs(address: string): Map<K, [V, string[]]>;

    public abstract getEverythingWithProofs(): Map<string, Map<K, [V, string[]]>> | undefined;

    public freeze(): void {
        if (this.countValues() < this.MINIMUM_VALUES) {
            // We will add two empty values to generate the tree

            const dummyValues = this.getDummyValues();
            for (const [address, map] of dummyValues) {
                if (!this.values.has(address)) {
                    this.values.set(address, map);
                } else {
                    const currentMap = this.values.get(address);
                    if (!currentMap) {
                        throw new Error('Map not found');
                    }

                    for (const [key, value] of map) {
                        if (!currentMap.has(key)) {
                            currentMap.set(key, value);
                        }
                    }
                }
            }
        }

        this.generateTree();

        this.frozen = true;
    }

    public getData(): Map<string, Map<K, V>> {
        return this.values;
    }

    public abstract getProofs(): Map<string, Map<K, string[]>>;

    public abstract updateValue(address: string, key: K, val: V): void;

    public abstract updateValues(address: string, val: Map<K, V>): void;

    public abstract getValues(): [Buffer, Buffer][];

    protected abstract getDummyValues(): Map<string, Map<K, V>>;

    private countValues(): number {
        let count = 0;
        for (const [, map] of this.values) {
            count += map.size;
        }

        return count;
    }
}

export abstract class MerkleTreeNew<K, V> {
    public readonly values: Map<string, Map<K, V>> = new Map();

    protected valueChanged: boolean = false;
    protected frozen: boolean = false;

    protected readonly DUMMY_ADDRESS_NON_EXISTENT = 'bc1dead';

    private readonly MINIMUM_VALUES = 2; // To generate a tree, we need at least 2 values

    protected constructor(protected readonly treeType: [string, string]) { }

    protected tree: MerkleTree = new MerkleTree()

    public toBytes(value: any): Uint8Array {
        const data = defaultAbiCoder.encode(this.treeType, value)
        const result = toBytes(data)
        return result
    }

    public getIndex(data: any): number {
        const hash = MerkleTree.hash(this.toBytes(data))
        return Number(this.tree.getLeafIndex(hash))
    }

    public getProofHashes(data: any): Array<string> {
        return this.tree.proof(new Uint32Array([this.getIndex(data)])).proofHashesHex()
    }

    get root(): string {
        if (!this.tree) {
            throw new Error('Merkle tree not generated');
        }

        return this.tree.rootHex()!
    }

    public verify(
        root: string,
        type: [string, string],
        value: Buffer[] | Uint8Array[],
        proof: string[],
    ): boolean {
        return MerkleProof.verifyOrdered(toBytes(root), this.toBytes(value), proof.map(p => toBytes(p)))
    }

    public size(): number {
        return this.values.size;
    }

    public abstract getValue(address: string, key: K): V | undefined;

    public abstract getValueWithProofs(
        address: string,
        key: K,
    ): [V | Uint8Array, string[]] | undefined;

    public hasTree(): boolean {
        return !!this.tree;
    }

    public generateTree(regeneratedIfValueChanged: boolean = true): void {
        if (this.frozen) {
            throw new Error('Merkle tree is frozen');
        }

        if (!this.values.size) {
            return;
        }


        if (this.tree && !this.valueChanged && !regeneratedIfValueChanged) {
            return;
        }


        const values = this.getValues();
        this.tree.append(values.map(l => this.toBytes(l)))
        this.tree.generateTree()

        this.valueChanged = false;
    }

    public abstract getValuesWithProofs(address: string): Map<K, [V, string[]]>;

    public abstract getEverythingWithProofs(): Map<string, Map<K, [V, string[]]>> | undefined;

    public freeze(): void {
        if (this.countValues() < this.MINIMUM_VALUES) {
            // We will add two empty values to generate the tree

            const dummyValues = this.getDummyValues();
            for (const [address, map] of dummyValues) {
                if (!this.values.has(address)) {
                    this.values.set(address, map);
                } else {
                    const currentMap = this.values.get(address);
                    if (!currentMap) {
                        throw new Error('Map not found');
                    }

                    for (const [key, value] of map) {
                        if (!currentMap.has(key)) {
                            currentMap.set(key, value);
                        }
                    }
                }
            }
        }

        this.generateTree();

        this.frozen = true;
    }

    public getData(): Map<string, Map<K, V>> {
        return this.values;
    }

    public abstract getProofs(): Map<string, Map<K, string[]>>;

    public abstract updateValue(address: string, key: K, val: V): void;

    public abstract updateValues(address: string, val: Map<K, V>): void;

    public abstract getValues(): [Buffer, Buffer][];

    protected abstract getDummyValues(): Map<string, Map<K, V>>;

    private countValues(): number {
        let count = 0;
        for (const [, map] of this.values) {
            count += map.size;
        }

        return count;
    }
}
