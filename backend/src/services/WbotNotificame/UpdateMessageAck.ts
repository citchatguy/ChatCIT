import Message from "../../models/Message";
import socketEmit from "../../helpers/socketEmit";

export const UpdateMessageAck = async (messageId: string): Promise<void> => {
  try {

    const message = await Message.findOne({
      where: {
        messageId
      },
    });

    if (!message) {
     // console.error("Mensagem não encontrada para o ID:", messageId);
   //   console.log("Tentando buscar novamente em 10 segundos...");

      setTimeout(async () => {
        await UpdateMessageAck(messageId);
      }, 5000);
      return;
    }

   // console.log("Mensagem encontrada:", message);
  //  console.log("Atualizando campo 'ack' para 3");

    await message.update({
      ack: 2,
    });

	    socketEmit({
        tenantId: message.tenantId,
        type: "chat:update",
        payload: message
      });

  // console.log("Campo 'ack' atualizado com sucesso");
  } catch (error) {
    console.error("Erro ao tentar atualizar o campo 'ack':", error);
  }
};
