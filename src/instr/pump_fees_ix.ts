import type { DexEvent } from "../core/dex_event.js";
import { makeMetadata } from "../core/metadata.js";
import { defaultPubkey } from "../core/dex_event.js";
import { readDiscriminatorU64, readU8 } from "../util/binary.js";
import { readFeesAt, readFeeTiersVec, readShareholdersVec } from "../logs/pump_fees.js";
import { u64leDiscriminator } from "../logs/program_log_discriminators.js";

const CREATE_FEE_SHARING_IX = u64leDiscriminator([195, 78, 86, 76, 111, 52, 251, 213]);
const INITIALIZE_FEE_CONFIG_IX = u64leDiscriminator([62, 162, 20, 133, 121, 65, 145, 27]);
const RESET_FEE_SHARING_IX = u64leDiscriminator([10, 2, 182, 95, 16, 127, 129, 186]);
const RESET_FEE_SHARING_V2_IX = u64leDiscriminator([169, 245, 17, 209, 94, 91, 248, 128]);
const REVOKE_FEE_SHARING_IX = u64leDiscriminator([18, 233, 158, 39, 185, 207, 58, 104]);
const TRANSFER_FEE_SHARING_IX = u64leDiscriminator([202, 10, 75, 200, 164, 34, 210, 96]);
const UPDATE_ADMIN_IX = u64leDiscriminator([161, 176, 40, 213, 60, 184, 179, 228]);
const UPDATE_FEE_CONFIG_IX = u64leDiscriminator([104, 184, 103, 242, 88, 151, 107, 20]);
const UPDATE_FEE_SHARES_IX = u64leDiscriminator([189, 13, 136, 99, 187, 164, 237, 35]);
const UPDATE_FEE_SHARES_V2_IX = u64leDiscriminator([111, 251, 49, 6, 78, 78, 106, 18]);
const UPSERT_FEE_TIERS_IX = u64leDiscriminator([227, 23, 150, 12, 77, 86, 94, 4]);

function account(accounts: string[], index: number): string | null {
  return accounts[index] ?? null;
}

function accountOrDefault(accounts: string[], index: number): string {
  return accounts[index] ?? defaultPubkey();
}

export function parsePumpFeesInstruction(
  instructionData: Uint8Array,
  accounts: string[],
  signature: string,
  slot: number,
  txIndex: number,
  blockTimeUs: number | undefined,
  grpcRecvUs: number
): DexEvent | null {
  const disc = readDiscriminatorU64(instructionData);
  if (disc === null) return null;
  const metadata = makeMetadata(signature, slot, txIndex, blockTimeUs, grpcRecvUs);

  if (disc === CREATE_FEE_SHARING_IX) {
    const admin = account(accounts, 2);
    const mint = account(accounts, 4);
    if (!admin || !mint) return null;
    return {
      PumpFeesCreateFeeSharingConfig: {
        metadata,
        timestamp: 0n,
        mint,
        bonding_curve: accountOrDefault(accounts, 7),
        pool: account(accounts, 10) ?? undefined,
        sharing_config: accountOrDefault(accounts, 5),
        admin,
        initial_shareholders: [],
        status: "Active",
      },
    };
  }

  if (disc === UPDATE_FEE_SHARES_IX || disc === UPDATE_FEE_SHARES_V2_IX) {
    const admin = account(accounts, 2);
    const mint = account(accounts, 4);
    const sharing_config = account(accounts, 5);
    if (!admin || !mint || !sharing_config) return null;
    const shareholders = readShareholdersVec(instructionData, 8);
    if (!shareholders || shareholders.next !== instructionData.length) return null;
    return {
      PumpFeesUpdateFeeShares: {
        metadata,
        timestamp: 0n,
        mint,
        sharing_config,
        admin,
        bonding_curve: accountOrDefault(accounts, 6),
        pump_creator_vault: accountOrDefault(accounts, 7),
        new_shareholders: shareholders.value,
      },
    };
  }

  if (disc === INITIALIZE_FEE_CONFIG_IX) {
    const admin = account(accounts, 0);
    const fee_config = account(accounts, 1);
    if (!admin || !fee_config) return null;
    return { PumpFeesInitializeFeeConfig: { metadata, timestamp: 0n, admin, fee_config } };
  }

  if (disc === RESET_FEE_SHARING_IX || disc === RESET_FEE_SHARING_V2_IX) {
    const new_admin = account(accounts, 0);
    const old_admin = account(accounts, 3);
    const mint = account(accounts, 5);
    const sharing_config = account(accounts, 6);
    if (!old_admin || !new_admin || !mint || !sharing_config) return null;
    return {
      PumpFeesResetFeeSharingConfig: {
        metadata,
        timestamp: 0n,
        mint,
        sharing_config,
        old_admin,
        old_shareholders: [],
        new_admin,
        new_shareholders: [],
      },
    };
  }

  if (disc === REVOKE_FEE_SHARING_IX) {
    const admin = account(accounts, 0);
    const mint = account(accounts, 2);
    const sharing_config = account(accounts, 3);
    if (!admin || !mint || !sharing_config) return null;
    return { PumpFeesRevokeFeeSharingAuthority: { metadata, timestamp: 0n, mint, sharing_config, admin } };
  }

  if (disc === TRANSFER_FEE_SHARING_IX) {
    const old_admin = account(accounts, 0);
    const mint = account(accounts, 2);
    const sharing_config = account(accounts, 3);
    const new_admin = account(accounts, 4);
    if (!old_admin || !mint || !sharing_config || !new_admin) return null;
    return {
      PumpFeesTransferFeeSharingAuthority: {
        metadata,
        timestamp: 0n,
        mint,
        sharing_config,
        old_admin,
        new_admin,
      },
    };
  }

  if (disc === UPDATE_ADMIN_IX) {
    const old_admin = account(accounts, 0);
    const new_admin = account(accounts, 2);
    if (!old_admin || !new_admin) return null;
    return { PumpFeesUpdateAdmin: { metadata, timestamp: 0n, old_admin, new_admin } };
  }

  if (disc === UPDATE_FEE_CONFIG_IX) {
    const fee_config = account(accounts, 0);
    const admin = account(accounts, 1);
    if (!fee_config || !admin) return null;
    const fee_tiers = readFeeTiersVec(instructionData, 8);
    if (!fee_tiers) return null;
    const flat_fees = readFeesAt(instructionData, fee_tiers.next);
    if (!flat_fees || flat_fees.next !== instructionData.length) return null;
    return {
      PumpFeesUpdateFeeConfig: {
        metadata,
        timestamp: 0n,
        admin,
        fee_config,
        fee_tiers: fee_tiers.value,
        flat_fees: flat_fees.value,
      },
    };
  }

  if (disc === UPSERT_FEE_TIERS_IX) {
    const fee_config = account(accounts, 0);
    const admin = account(accounts, 1);
    if (!fee_config || !admin) return null;
    const fee_tiers = readFeeTiersVec(instructionData, 8);
    if (!fee_tiers) return null;
    const offset = readU8(instructionData, fee_tiers.next);
    if (offset === null || fee_tiers.next + 1 !== instructionData.length) return null;
    return { PumpFeesUpsertFeeTiers: { metadata, timestamp: 0n, admin, fee_config, fee_tiers: fee_tiers.value, offset } };
  }

  return null;
}
