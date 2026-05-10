import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import { runtimeEnv } from "../config/runtime-env.js";

let sesClient: SESClient | null = null;

const getSesClient = (): SESClient => {
  if (sesClient) {
    return sesClient;
  }

  sesClient =
    runtimeEnv.AWS_SES_ACCESS_KEY_ID && runtimeEnv.AWS_SES_SECRET_ACCESS_KEY
      ? new SESClient({
          region: runtimeEnv.AWS_SES_REGION,
          credentials: {
            accessKeyId: runtimeEnv.AWS_SES_ACCESS_KEY_ID,
            secretAccessKey: runtimeEnv.AWS_SES_SECRET_ACCESS_KEY,
          },
        })
      : new SESClient({
          region: runtimeEnv.AWS_SES_REGION,
        });

  return sesClient;
};

export const emailService = {
  async sendEmail(input: {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    await getSesClient().send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: [input.to],
        },
        Message: {
          Subject: {
            Charset: "UTF-8",
            Data: input.subject,
          },
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: input.text,
            },
            ...(input.html
              ? {
                  Html: {
                    Charset: "UTF-8",
                    Data: input.html,
                  },
                }
              : {}),
          },
        },
        Source: input.from,
      }),
    );
  },
};
