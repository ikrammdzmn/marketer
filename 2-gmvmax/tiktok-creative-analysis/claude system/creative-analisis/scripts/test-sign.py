import hmac, hashlib
q={'app_key':'KEY123','timestamp':'1730000000','shop_cipher':'CIPHER','page_size':'100','start_date_ge':'2026-11-01'}
sec='SECRET456'; path='/analytics/202509/shop_videos/performance'
m=sec+path+''.join(k+q[k] for k in sorted(q))+sec
print(hmac.new(sec.encode(),m.encode(),hashlib.sha256).hexdigest())
