/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Privacy } from "./privacy_policy.model";

interface PrivacyData {
  title: string;
  editor_html: string;
}

const add_or_update_privacy = async (data: PrivacyData) => {
  // Upsert: update the existing document or create if it doesn't exist
  console.log(data);
  const savedPrivacy = await Privacy.findOneAndUpdate(
    {}, // match any document
    { $set: data }, // update fields
    { upsert: true, new: true, setDefaultsOnInsert: true } // upsert + return new doc
  );

  return savedPrivacy;
};
const get_privacy = async () => {
  const privacyDoc = await Privacy.findOne({});
  return privacyDoc;
};

export const PrivacyService = { add_or_update_privacy, get_privacy };
