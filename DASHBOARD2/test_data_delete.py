import firebase_admin
from firebase_admin import credentials, db # type: ignore

# 用你下载的 Firebase Admin SDK 的 JSON 文件
cred = credentials.Certificate("techin515-5e18e-firebase-adminsdk-fbsvc-b44695608c.json")

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://techin515-5e18e-default-rtdb.firebaseio.com/'
})

# 删除 sensors/history 节点
ref = db.reference('sensors/history')
ref.delete()

# 如果想连 latest 一起删掉也可以
db.reference('sensors/latest').delete()
