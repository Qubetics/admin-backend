import { MAIL_SUBJECT, RES_MSG, approveTemplate, rejectedTemplate } from "../../constant";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(environment.sendgrid_key);
class MailService {
  public sendApprovalMail = async (email: string, nodeName: string, isApproved: boolean) => {
    try {
      const subject = isApproved ? MAIL_SUBJECT.APPROVAL : MAIL_SUBJECT.REJECTION;

      const msg = {
        to: email,
        from: environment.service_email,
        subject,
        html: isApproved ? approveTemplate() : rejectedTemplate(),
      };

      await sgMail.send(msg);

      return {
        error: false,
        message: RES_MSG.EMAIL_SENT_SUCCESS,
      };
    } catch (err: any) {
      if (err instanceof Error) {
        return { error: true, message: err.message };
      }
      return { error: true, message: RES_MSG.ERROR };
    }
  };
}

export default new MailService();
