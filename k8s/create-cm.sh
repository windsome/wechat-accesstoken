# 拷贝conf到k8s-master上
scp conf/* root@xiaobei1:/data/k8s/conf/
# 创建configmap
ssh root@xiaobei1
kubectl create configmap wechat-accesstoken-cm --from-file=/data/k8s/conf/
