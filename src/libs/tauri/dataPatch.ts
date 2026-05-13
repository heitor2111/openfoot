import { invoke } from '@tauri-apps/api/core'

export interface DataPatchMetadata {
  patchId: string
  baseVersion?: string | null
  author?: string | null
  createdAt: string
}

export interface EntityPatch<T = Record<string, unknown>> {
  upserts: T[]
  deletes: string[]
}

export interface DataPatch {
  metadata: DataPatchMetadata
  leagues: EntityPatch
  teams: EntityPatch
  players: EntityPatch
}

export interface DataBundle {
  leagues: Record<string, unknown>[]
  teams: Record<string, unknown>[]
  players: Record<string, unknown>[]
}

export interface ApplyDataPatchReport {
  dryRun: boolean
  valid: boolean
  errors: string[]
  warnings: string[]
  leaguesUpserts: number
  leaguesDeletes: number
  teamsUpserts: number
  teamsDeletes: number
  playersUpserts: number
  playersDeletes: number
  resultingLeagues: number
  resultingTeams: number
  resultingPlayers: number
}

export const exportDataBundle = async (): Promise<DataBundle> => {
  const json = await invoke<string>('export_data_bundle')
  return JSON.parse(json) as DataBundle
}

export const createDataPatch = async (
  baseBundle: DataBundle,
  targetBundle: DataBundle,
  baseVersion?: string,
  author?: string
): Promise<DataPatch> => {
  const json = await invoke<string>('create_data_patch', {
    baseBundleJson: JSON.stringify(baseBundle),
    targetBundleJson: JSON.stringify(targetBundle),
    baseVersion,
    author,
  })

  return JSON.parse(json) as DataPatch
}

export const applyDataPatch = async (
  patch: DataPatch,
  dryRun = true
): Promise<ApplyDataPatchReport> =>
  invoke<ApplyDataPatchReport>('apply_data_patch', {
    patchJson: JSON.stringify(patch),
    dryRun,
  })

export const exportDataPatchTemplate = async (
  baseVersion?: string,
  author?: string
): Promise<DataPatch> => {
  const json = await invoke<string>('export_data_patch_template', {
    baseVersion,
    author,
  })

  return JSON.parse(json) as DataPatch
}
