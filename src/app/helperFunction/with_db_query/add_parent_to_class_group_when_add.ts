/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientSession, Types } from "mongoose";
import ChatRoom from "../../modules/chat/chat_room/chat_room.model";
import { ChatRoomMember } from "../../modules/chat/chat_room_members/chat_room_members.model";
import { chat_member_type } from "../../modules/chat/chat_room_members/chat_room_members.interface";
export async function ensureParentChats(
  parentId: string,
  teacherId: string,
  classId: string,
  session: ClientSession
) {
  if (
    !Types.ObjectId.isValid(parentId) ||
    !Types.ObjectId.isValid(teacherId) ||
    !Types.ObjectId.isValid(classId)
  ) {
    throw new Error("Invalid ObjectId provided to ensureParentChats");
  }

  // 1️⃣ Fetch both class groups (max 2: public + teacher_only) in one query
  const groups = await ChatRoom.find({
    class: classId,
    type: { $in: ["group", "teacher_only"] },
  }).session(session);

  const publicGroup = groups.find((g) => g.type === "group") || null;
  const teacherOnlyGroup =
    groups.find((g) => g.type === "teacher_only") || null;

  // 2️⃣ Bulk upsert parent into both groups
  const bulkOps: any[] = [];
  [publicGroup, teacherOnlyGroup].forEach((grp) => {
    if (grp) {
      bulkOps.push({
        updateOne: {
          filter: { chat: grp._id, user: parentId },
          update: {
            chat: grp._id,
            user: parentId,
            type: "parent" as (typeof chat_member_type)[number],
          },
          upsert: true,
        },
      });
    }
  });
  if (bulkOps.length) await ChatRoomMember.bulkWrite(bulkOps, { session });

  // 3️⃣ Check if individual chat exists between teacher & parent
  const [individualChat] = await ChatRoom.aggregate([
    { $match: { type: "individual" } },
    {
      $lookup: {
        from: "chatroommembers",
        localField: "_id",
        foreignField: "chat",
        as: "members",
      },
    },
    {
      $match: {
        "members.user": {
          $all: [new Types.ObjectId(parentId), new Types.ObjectId(teacherId)],
        },
      },
    },
    { $limit: 1 },
  ]).session(session);

  let chat = individualChat || null;

  // 4️⃣ Create individual chat if not exists
  if (!chat) {
    [chat] = await ChatRoom.create([{ type: "individual" }], { session });
    await ChatRoomMember.insertMany(
      [
        { chat: chat._id, user: teacherId, type: "teacher" },
        { chat: chat._id, user: parentId, type: "parent" },
      ],
      { session }
    );
  }

  return { publicGroup, teacherOnlyGroup, individualChat: chat };
}
