export interface IKidsFile {
  title: string;
  description?: string; // optional because default exists
  url: string;
}

export interface IKidsProgressReport {
  _id?: string;
  kids_id: string;
  files: IKidsFile[];
  createdAt?: Date;
  updatedAt?: Date;
}
