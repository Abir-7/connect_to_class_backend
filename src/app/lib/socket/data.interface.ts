//---------------------------sending message-------
interface Sender {
  _id: string;
  full_name: string;
  image: string;
}

export interface MessageData {
  sender: Sender;
  text: string;
  image: string[];
  createdAt?: string; // will be added automatically
}

export interface SendMessagePayload {
  chat_id: string;
  message_data: MessageData;
}
