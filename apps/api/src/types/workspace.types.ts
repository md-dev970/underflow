export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

export interface UpdateWorkspaceInput {
  name?: string | undefined;
  slug?: string | undefined;
}

export interface DeletedWorkspaceResult {
  id: string;
  deletedAwsAccountCount: number;
  deletedAlertCount: number;
  deletedSnapshotCount: number;
  deletedSyncRunCount: number;
  deletedNotificationCount: number;
}
