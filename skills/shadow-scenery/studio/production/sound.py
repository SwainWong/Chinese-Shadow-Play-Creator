"""Five-second original studio cues: air, bamboo knock, and an eave bell."""
from pathlib import Path
import wave
import numpy as np
from scipy.signal import butter, sosfilt
root=Path(__file__).resolve().parents[1]; rate=48000
t=np.arange(rate*5)/rate
for i,name in enumerate(['house','temple']):
    rng=np.random.default_rng(57+i)
    noise=sosfilt(butter(2,[270,1500],btype='bandpass',fs=rate,output='sos'),rng.standard_normal((len(t),2)),axis=0)
    start=[1.03,1.29][i]
    envelope=.20+np.exp(-((t-start-.65)/.75)**2)*.80
    mix=noise*envelope[:,None]*.041
    def tone(at,partials,decay,gain,pan):
        u=t-at; env=(u>=0)*(1-np.exp(-np.maximum(0,u)*155))*np.exp(-np.maximum(u,0)*decay)
        v=sum(a*np.sin(2*np.pi*freq*u) for freq,a in partials)*env*gain
        mix[:]+=v[:,None]*np.array(pan)
    if i:
        for at,gain in [(start+.47,.105),(start+1.12,.043)]:
            tone(at,[(710,1),(1521,.29),(2063,.22)],2.6,gain,[.48,.93])
    else:
        tone(.45,[(315,1),(875,.48)],20,.105,[.86,.51])
    mix*=np.minimum(1,np.minimum(t/.15,(5-t)/.18))[:,None]
    with wave.open(str(root/'art'/f'{name}.wav'),'wb') as w:
        w.setparams((2,2,rate,0,'NONE',''));w.writeframes(np.rint(mix*32767).astype('<i2').tobytes())
