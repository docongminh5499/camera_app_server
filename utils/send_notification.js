const FCM = require('fcm-node')
const fcm = new FCM(process.env.SERVER_KEY);

module.exports = function sendNotification(listToken) {
    if (listToken.length == 0)
        return;


    let message = {
        registration_ids: listToken,
        data: {},
        priority: 'high',
        content_available: true,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        notification: {
            title: 'Bạn có thông báo mới',
            body: 'Chạm để xem ngay',
            sound: "default",
            badge: "1"
        }
    };

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!");
            console.log(err);
        } else {
            console.log("Successfully sent with response");
        }
    });
}

