import { RES_MSG } from "../../constant";
import sgMail from '@sendgrid/mail';


sgMail.setApiKey(environment.sendgrid_key);
class MailService{
    
   public sendApprovalMail= async (email:string,nodeName:string, isApproved:boolean)=> {
        try{
            const subject = isApproved
            ? `Node ${nodeName} Approved`
            : `Node ${nodeName} Rejected`;
      
          const message = isApproved
            ? `Congratulations! Your node "${nodeName}" has been approved.`
            : `Unfortunately, your node "${nodeName}" has been rejected. Please review your submission.`;
      
          const msg = {
            to:email,
            from: environment.service_email,
            subject,
            text: message,
            html: `<p>${message}</p>`,
          };

          await sgMail.send(msg)

            return {
                error: false,
                message: RES_MSG.EMAIL_SENT_SUCCESS,
              };
        }
        catch (err) {
            if (err instanceof Error) {
              return { error: true, message: err.message };
            }
            return { error: true, message: RES_MSG.ERROR };
          }

    }

}

export default new MailService()
