export class UpdateThreadStateDto {
  threadId: string;
  values: any;
  checkpoint_id?: string;
  as_node?: string;
}
