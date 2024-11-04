import { Address, EcKeyPair } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

export const NETWORK = networks.regtest;

export function randomAddress(): Address {
    const rndKeyPair = EcKeyPair.generateRandomKeyPair(NETWORK);
    return new Address(rndKeyPair.publicKey);
}
