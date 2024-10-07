import Setting from "../models/Setting";

export const showHubToken = async (tenantId: string): Promise<string> => {

  const hubToken = await Setting.findOne({
    where: { key: "hubToken", tenantId }
  });

  console.log()

  if (!hubToken?.value || typeof hubToken?.value !== 'string') {
    throw new Error("Notificame Hub token not found");
  }

  return hubToken.value;
};