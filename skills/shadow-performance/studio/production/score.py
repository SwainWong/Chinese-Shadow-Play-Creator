"""Render the short original stage score. Run with an optional form number (1–15)."""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
DURATION = 4
# Pickup pattern, accent instruments with gains, air lead, and stage position.
# Times in the pickup are relative to the main accent, which is read from moves.js.
SCORE = {
    1: ([(-2.30,'gong',.40),(-1.72,'wood',.36),(-.54,'skin',.35)], [('smallgong',.83),('wood',.38)], .23, -.16),
    2: ([(-1.84,'wood',.50),(-1.42,'wood',.32),(-.67,'skin',.59)], [('wood',.97),('drum',.60)], .27, .30),
    3: ([(-1.96,'drum',.60),(-1.35,'skin',.38),(-.83,'skin',.43),(-.37,'skin',.51)], [('gong',.99),('drum',.95),('cym',.32)], .41, -.08),
    4: ([(-2.14,'smallgong',.40),(-1.29,'wood',.34),(-.95,'wood',.45)], [('mute',.86),('skin',.63)], .18, -.46),
    5: ([(-1.92,'skin',.50),(-1.58,'wood',.43),(-.88,'drum',.43)], [('cym',.69),('skin',.78)], .49, .30),
    6: ([(-2.20,'wood',.44),(-1.71,'skin',.37),(-.97,'smallgong',.45)], [('smallgong',.86),('wood',.69)], .36, .26),
    7: ([(-2.28,'wood',.42),(-1.80,'wood',.36),(-1.20,'skin',.39)], [('wood',.76),('mute',.44)], .14, -.16),
    8: ([(-2.38,'smallgong',.48),(-1.89,'skin',.49),(-1.42,'wood',.36),(-.58,'skin',.43)], [('cym',.77),('smallgong',.50)], .22, .22),
    9: ([(-1.96,'gong',.32),(-1.20,'wood',.41)], [('smallgong',.57)], .10, -.22),
    10: ([(-1.93,'drum',.50),(-1.44,'skin',.53),(-1.14,'skin',.58),(-.83,'skin',.64)], [('cym',.54),('smallgong',.71)], .54, .32),
    11: ([(-2.10,'wood',.42),(-1.72,'skin',.51),(-.80,'wood',.57)], [('skin',.89),('smallgong',.68)], .28, -.31),
    12: ([(-2.52,'gong',.51),(-1.88,'skin',.52),(-1.52,'skin',.38),(-.94,'wood',.50)], [('gong',1.0),('drum',1.0),('cym',.42)], .24, 0),
    13: ([(-1.77,'smallgong',.40),(-1.15,'skin',.37),(-.70,'wood',.29)], [('smallgong',.70),('mute',.28)], .30, -.06),
    14: ([(-1.89,'skin',.53),(-1.34,'wood',.31)], [('wood',.85),('skin',.89)], .16, .29),
    15: ([(-2.37,'smallgong',.40),(-1.82,'wood',.48),(-1.25,'skin',.50),(-.55,'skin',.37)], [('gong',.92),('drum',.82),('wood',.68)], .20, .02),
}
# Frequencies and individual decay times for the struck surfaces.
MODES = {
    'gong': [(151,.88,1),(209,.78,.62),(284,.56,.55),(433,.48,.37),(682,.30,.26),(1091,.20,.18),(1913,.10,.12)],
    'smallgong': [(422,.45,.84),(573,.44,.72),(806,.30,.55),(1249,.27,.42),(1835,.16,.32),(2663,.10,.19)],
    'mute': [(326,.085,.94),(452,.052,.60),(719,.055,.40),(1160,.032,.30)],
    'wood': [(718,.043,.92),(1240,.033,.72),(2133,.022,.64),(3110,.013,.32)],
    'skin': [(196,.10,1),(316,.065,.65),(487,.060,.64),(811,.042,.48),(1214,.032,.25)],
    'drum': [(91,.24,1),(152,.16,.62),(224,.12,.50),(352,.078,.31),(557,.055,.20)],
}


def noise_band(rng, count, lo, hi):
    noise = rng.standard_normal(count)
    return sosfilt(butter(2,[lo,hi],btype='bandpass',fs=RATE,output='sos'),noise)


def tone(rng, instrument):
    if instrument == 'cym':
        t = np.arange(round(.98*RATE)) / RATE
        sound = noise_band(rng,len(t),950,11800) * np.exp(-t/.18)
        for f in (671,911,1177,1741,2101,2737,3083):
            sound += .13*np.sin(2*np.pi*f*t + .8*np.sin(2*np.pi*(f*.117)*t))*np.exp(-t/.24)
    else:
        modes = MODES[instrument]
        t = np.arange(round(min(2.35,modes[0][1]*4.4)*RATE)) / RATE
        sound = np.zeros(len(t))
        detune = rng.uniform(.976,1.022)
        glide = {'gong':-.055,'smallgong':.058,'drum':.36,'skin':.26}.get(instrument,.015)
        for f,decay,gain in modes:
            phase = 2*np.pi*f*detune*(t + glide*.042*(1-np.exp(-t/.042)))
            sound += gain*np.sin(phase+rng.uniform(-.18,.18))*np.exp(-t/decay)
        sound += .36*noise_band(rng,len(t),830,9100)*np.exp(-t/.012)
    sound *= np.minimum(t/.0015,1)
    return sound / (np.max(np.abs(sound)) + 1e-9)


def air(rng, duration):
    t=np.arange(round(duration*RATE))/RATE
    u=t/duration
    body=noise_band(rng,len(t),220,2200)
    edge=noise_band(rng,len(t),1700,6200)
    sound=(body*(1.2-u)+edge*u*.88)*np.sin(np.pi*u)**1.6
    return sound/(np.max(np.abs(sound))+1e-9)


def render(number, move):
    rng=np.random.default_rng(17080+number)
    mix=np.zeros((DURATION*RATE,2))
    pickup, instruments, lead, pan=SCORE[number]
    accent=move['accent']

    def place(t, sound, gain, stereo=0):
        offset=round(t*RATE)
        start=max(0,offset)
        stop=min(len(mix),offset+len(sound))
        if stop<=start: return
        angle=(stereo+1)*np.pi/4
        mix[start:stop] += gain*sound[start-offset:stop-offset,None] * [np.cos(angle),np.sin(angle)]

    def stroke(t, instrument, gain, stereo=0):
        place(t,tone(rng,instrument),gain,stereo)

    for dt, inst, gain in pickup:
        stroke(accent+dt,inst,gain,pan*.45)
    place(accent-lead,air(rng,lead),.13 if number==9 else .34,pan)
    for inst, gain in instruments:
        stroke(accent,inst,gain,pan*.6)

    for event in move.get('events',[]):
        t,kind=event['t'],event['type']
        if abs(t-accent)<.065: continue
        if kind in ('step','land'):
            stroke(t,'drum' if kind=='land' else 'skin',.66 if kind=='land' else .37,-pan*.3)
        elif kind in ('catch','settle'):
            stroke(t,'wood',.49,-pan)
        elif kind=='takeoff':
            stroke(t,'skin',.55,pan*.4)
            place(t,air(rng,.33),.23,pan)
        elif kind=='gather':
            stroke(t,'mute',.32,-pan*.3)
        elif kind=='point':
            place(t-.18,air(rng,.18),.31,pan)
            stroke(t,'wood',.62+min(.16,t*.043),pan*.5)
        elif kind in ('circle','sweep','turn','lift','release'):
            duration=.31 if kind in ('circle','sweep') else .19
            place(t-duration,air(rng,duration),.31,-pan)
        else:
            raise ValueError(f'No sound mapped to event {kind!r} in form {number}')

    # Short, asymmetric wooden-stage reflections followed by an independent tail.
    dry=mix.copy()
    for ms,gain in [(21,.072),(34,.053),(57,.027)]:
        length=round(RATE*ms/1000)
        mix[length:] += dry[:-length,::-1]*gain
    mix=np.tanh(mix*.94)*.89
    mix[-2880:] *= np.linspace(1,0,2880)[:,None]
    wavfile.write(ROOT/'assets'/'audio'/f'{number:02}.wav',RATE,np.rint(32767*mix).astype('<i2'))


def movements():
    js="global.window=global;require(process.argv[1]);console.log(JSON.stringify(window.moves.map(m=>({accent:m.accent,events:m.events}))))"
    path=ROOT/'production'/'moves.js'
    return json.loads(subprocess.check_output(['node','-e',js,str(path)],text=True))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('forms',nargs='*',type=int,help='render just these 1-based form numbers')
    ids=parser.parse_args().forms or list(range(1,len(SCORE)+1))
    if any(n not in SCORE for n in ids): parser.error('Forms must be 1 to 15')
    moves=movements()
    (ROOT/'assets'/'audio').mkdir(parents=True,exist_ok=True)
    for num in ids:
        render(num,moves[num-1])
