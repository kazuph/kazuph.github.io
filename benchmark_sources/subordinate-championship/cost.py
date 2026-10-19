import json,glob,sys
JPY=158.0
# USD per 1M tokens: (input, cache_write_5m, cache_read, output, cache_write_1h)
CL={'claude-sonnet-5-5':[(None,(2,2.5,0.10,10,4))],
    'claude-haiku-5-5':[(100_000,(0.10,0.125,0.01,0.50,0.20)),(None,(0.50,0.625,0.05,2.50,1.0))],
    'claude-opus-5-5':[(None,(4,5,0.20,20,8))]}
def claude(glob_, cut):
    f=glob.glob(glob_)[0]; seen={}
    for line in open(f):
        try:o=json.loads(line)
        except:continue
        if o.get('type')!='assistant':continue
        if cut and o.get('timestamp','')>cut:continue
        m=o['message']; u=m.get('usage')
        if u: seen[m.get('id')]=(m.get('model'),u)
    t={'input':0,'cache_write':0,'cache_read':0,'output':0}; usd=0
    for mod,u in seen.values():
        i,w,r,out=u.get('input_tokens',0),u.get('cache_creation_input_tokens',0),u.get('cache_read_input_tokens',0),u.get('output_tokens',0)
        prompt=i+w+r
        for lim,p in CL[mod]:
            if lim is None or prompt<=lim: break
        cc=u.get('cache_creation') or {}; w1=cc.get('ephemeral_1h_input_tokens',0); w5=w-w1
        usd+=(i*p[0]+w5*p[1]+w1*p[4]+r*p[2]+out*p[3])/1e6
        t['input']+=i;t['cache_write']+=w;t['cache_read']+=r;t['output']+=out
    return t,usd
def flat(inp,cached,out,p):  # p=(input,cached,output)
    return ((inp-cached)*p[0]+cached*p[1]+out*p[2])/1e6
import os
H=os.path.expanduser('~/.claude/projects/')+'-Users-kazuph-src-github-com-kazuph-buzzer-quiz-contest-'
rows=[]
for name,g,cut in [('Sonnet 5.5',H+'sonnet/*.jsonl','2026-10-18T09:15:12.361Z'),('Haiku 5.5',H+'haiku/*.jsonl','2026-10-18T09:08:44.787Z')]+([('Opus 5.5',H+'opus/*.jsonl',sys.argv[1])] if len(sys.argv)>1 else []):
    t,usd=claude(g,cut)
    rows.append((name,t['input']+t['cache_write']+t['cache_read'],t['cache_read'],t['output'],usd))
for name,inp,cached,out,p in [('Sol（なし）',6794104,6612096,45610,(2,0.10,10)),('Sol（あり）',7873318,7680768,45284,(2,0.10,10)),('Devin',6664994,6541278,65391,(3,0.30,15))]:
    rows.append((name,inp,cached,out,flat(inp,cached,out,p)))
for r in rows: print(f"{r[0]:12s} 入力 {r[1]/1e6:6.2f}M（うちキャッシュ読み {r[2]/1e6:6.2f}M） 出力 {r[3]/1e3:6.1f}k  ${r[4]:6.2f}  約{r[4]*JPY:5.0f}円")
