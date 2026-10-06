import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'https://teknium.io/hermes-devices/';
const OUTPUT = fileURLToPath(new URL('../data/wiki/workshop.json', import.meta.url));
const JAPANESE = fileURLToPath(new URL('../data/wiki/workshop.ja.json', import.meta.url));

// 2026-10-06 sora 判断。日本の法律に触れる使い方がある分類は掲載しない。
const EXCLUDED_IDS = new Set([
  'security-and-hacker-tools',
  'spy-and-covert-gadgets',
]);
// 掲載する分類の中でも、同じ理由で外す機器（Wi-Fi の通信を集める機器）。
const EXCLUDED_ITEM_IDS = new Set(['pwnagotchi']);

// HTML5 の名前付き実体参照。Python 標準ライブラリ html.entities.html5 の
// 対応表を「16進コードポイント:名前,別名」の形式で内包し、実行時の依存を増やさない。
const ENTITY_TABLE = `
9:Tab a:NewLine 21:excl 22:QUOT,quot 23:num 24:dollar 25:percnt 26:AMP,amp 27:apos 28:lpar 29:rpar 2a:ast,midast 2b:plus 2c:comma 2e:period 2f:sol 3a:colon 3b:semi 3c:LT,lt 3c+20d2:nvlt 3d:equals 3d+20e5:bne 3e:GT,gt 3e+20d2:nvgt 3f:quest 40:commat 5b:lbrack,lsqb 5c:bsol 5d:rbrack,rsqb 5e:Hat 5f:UnderBar,lowbar 60:DiacriticalGrave,grave 66+6a:fjlig 7b:lbrace,lcub 7c:VerticalLine,verbar,vert 7d:rbrace,rcub
a0:NonBreakingSpace,nbsp a1:iexcl a2:cent a3:pound a4:curren a5:yen a6:brvbar a7:sect a8:Dot,DoubleDot,die,uml a9:COPY,copy aa:ordf ab:laquo ac:not ad:shy ae:REG,circledR,reg af:macr,strns b0:deg b1:PlusMinus,plusmn,pm b2:sup2 b3:sup3 b4:DiacriticalAcute,acute b5:micro b6:para b7:CenterDot,centerdot,middot b8:Cedilla,cedil b9:sup1 ba:ordm bb:raquo bc:frac14 bd:frac12,half be:frac34 bf:iquest
c0:Agrave c1:Aacute c2:Acirc c3:Atilde c4:Auml c5:Aring,angst c6:AElig c7:Ccedil c8:Egrave c9:Eacute ca:Ecirc cb:Euml cc:Igrave cd:Iacute ce:Icirc cf:Iuml d0:ETH d1:Ntilde d2:Ograve d3:Oacute d4:Ocirc d5:Otilde d6:Ouml d7:times d8:Oslash d9:Ugrave da:Uacute db:Ucirc dc:Uuml dd:Yacute de:THORN df:szlig e0:agrave e1:aacute e2:acirc e3:atilde e4:auml e5:aring e6:aelig e7:ccedil e8:egrave e9:eacute ea:ecirc eb:euml ec:igrave ed:iacute ee:icirc ef:iuml f0:eth f1:ntilde f2:ograve f3:oacute f4:ocirc f5:otilde f6:ouml f7:div,divide f8:oslash f9:ugrave fa:uacute fb:ucirc fc:uuml fd:yacute fe:thorn ff:yuml
100:Amacr 101:amacr 102:Abreve 103:abreve 104:Aogon 105:aogon 106:Cacute 107:cacute 108:Ccirc 109:ccirc 10a:Cdot 10b:cdot 10c:Ccaron 10d:ccaron 10e:Dcaron 10f:dcaron 110:Dstrok 111:dstrok 112:Emacr 113:emacr 116:Edot 117:edot 118:Eogon 119:eogon 11a:Ecaron 11b:ecaron 11c:Gcirc 11d:gcirc 11e:Gbreve 11f:gbreve 120:Gdot 121:gdot 122:Gcedil 124:Hcirc 125:hcirc 126:Hstrok 127:hstrok 128:Itilde 129:itilde 12a:Imacr 12b:imacr 12e:Iogon 12f:iogon 130:Idot 131:imath,inodot 132:IJlig 133:ijlig 134:Jcirc 135:jcirc 136:Kcedil 137:kcedil 138:kgreen 139:Lacute 13a:lacute 13b:Lcedil 13c:lcedil 13d:Lcaron 13e:lcaron 13f:Lmidot 140:lmidot 141:Lstrok 142:lstrok 143:Nacute 144:nacute 145:Ncedil 146:ncedil 147:Ncaron 148:ncaron 149:napos 14a:ENG 14b:eng 14c:Omacr 14d:omacr 150:Odblac 151:odblac 152:OElig 153:oelig 154:Racute 155:racute 156:Rcedil 157:rcedil 158:Rcaron 159:rcaron 15a:Sacute 15b:sacute 15c:Scirc 15d:scirc 15e:Scedil 15f:scedil 160:Scaron 161:scaron 162:Tcedil 163:tcedil 164:Tcaron 165:tcaron 166:Tstrok 167:tstrok 168:Utilde 169:utilde 16a:Umacr 16b:umacr 16c:Ubreve 16d:ubreve 16e:Uring 16f:uring 170:Udblac 171:udblac 172:Uogon 173:uogon 174:Wcirc 175:wcirc 176:Ycirc 177:ycirc 178:Yuml 179:Zacute 17a:zacute 17b:Zdot 17c:zdot 17d:Zcaron 17e:zcaron 192:fnof 1b5:imped 1f5:gacute 237:jmath 2c6:circ 2c7:Hacek,caron 2d8:Breve,breve 2d9:DiacriticalDot,dot 2da:ring 2db:ogon 2dc:DiacriticalTilde,tilde 2dd:DiacriticalDoubleAcute,dblac 311:DownBreve
391:Alpha 392:Beta 393:Gamma 394:Delta 395:Epsilon 396:Zeta 397:Eta 398:Theta 399:Iota 39a:Kappa 39b:Lambda 39c:Mu 39d:Nu 39e:Xi 39f:Omicron 3a0:Pi 3a1:Rho 3a3:Sigma 3a4:Tau 3a5:Upsilon 3a6:Phi 3a7:Chi 3a8:Psi 3a9:Omega,ohm 3b1:alpha 3b2:beta 3b3:gamma 3b4:delta 3b5:epsi,epsilon 3b6:zeta 3b7:eta 3b8:theta 3b9:iota 3ba:kappa 3bb:lambda 3bc:mu 3bd:nu 3be:xi 3bf:omicron 3c0:pi 3c1:rho 3c2:sigmaf,sigmav,varsigma 3c3:sigma 3c4:tau 3c5:upsi,upsilon 3c6:phi 3c7:chi 3c8:psi 3c9:omega 3d1:thetasym,thetav,vartheta 3d2:Upsi,upsih 3d5:phiv,straightphi,varphi 3d6:piv,varpi 3dc:Gammad 3dd:digamma,gammad 3f0:kappav,varkappa 3f1:rhov,varrho 3f5:epsiv,straightepsilon,varepsilon 3f6:backepsilon,bepsi
401:IOcy 402:DJcy 403:GJcy 404:Jukcy 405:DScy 406:Iukcy 407:YIcy 408:Jsercy 409:LJcy 40a:NJcy 40b:TSHcy 40c:KJcy 40e:Ubrcy 40f:DZcy 410:Acy 411:Bcy 412:Vcy 413:Gcy 414:Dcy 415:IEcy 416:ZHcy 417:Zcy 418:Icy 419:Jcy 41a:Kcy 41b:Lcy 41c:Mcy 41d:Ncy 41e:Ocy 41f:Pcy 420:Rcy 421:Scy 422:Tcy 423:Ucy 424:Fcy 425:KHcy 426:TScy 427:CHcy 428:SHcy 429:SHCHcy 42a:HARDcy 42b:Ycy 42c:SOFTcy 42d:Ecy 42e:YUcy 42f:YAcy 430:acy 431:bcy 432:vcy 433:gcy 434:dcy 435:iecy 436:zhcy 437:zcy 438:icy 439:jcy 43a:kcy 43b:lcy 43c:mcy 43d:ncy 43e:ocy 43f:pcy 440:rcy 441:scy 442:tcy 443:ucy 444:fcy 445:khcy 446:tscy 447:chcy 448:shcy 449:shchcy 44a:hardcy 44b:ycy 44c:softcy 44d:ecy 44e:yucy 44f:yacy 451:iocy 452:djcy 453:gjcy 454:jukcy 455:dscy 456:iukcy 457:yicy 458:jsercy 459:ljcy 45a:njcy 45b:tshcy 45c:kjcy 45e:ubrcy 45f:dzcy
2002:ensp 2003:emsp 2004:emsp13 2005:emsp14 2007:numsp 2008:puncsp 2009:ThinSpace,thinsp 200a:VeryThinSpace,hairsp 200b:NegativeMediumSpace,NegativeThickSpace,NegativeThinSpace,NegativeVeryThinSpace,ZeroWidthSpace 200c:zwnj 200d:zwj 200e:lrm 200f:rlm 2010:dash,hyphen 2013:ndash 2014:mdash 2015:horbar 2016:Verbar,Vert 2018:OpenCurlyQuote,lsquo 2019:CloseCurlyQuote,rsquo,rsquor 201a:lsquor,sbquo 201c:OpenCurlyDoubleQuote,ldquo 201d:CloseCurlyDoubleQuote,rdquo,rdquor 201e:bdquo,ldquor 2020:dagger 2021:Dagger,ddagger 2022:bull,bullet 2025:nldr 2026:hellip,mldr 2030:permil 2031:pertenk 2032:prime 2033:Prime 2034:tprime 2035:backprime,bprime 2039:lsaquo 203a:rsaquo 203e:OverBar,oline 2041:caret 2043:hybull 2044:frasl 204f:bsemi 2057:qprime 205f:MediumSpace 205f+200a:ThickSpace 2060:NoBreak 2061:ApplyFunction,af 2062:InvisibleTimes,it 2063:InvisibleComma,ic 20ac:euro 20db:TripleDot,tdot 20dc:DotDot
2102:Copf,complexes 2105:incare 210a:gscr 210b:HilbertSpace,Hscr,hamilt 210c:Hfr,Poincareplane 210d:Hopf,quaternions 210e:planckh 210f:hbar,hslash,planck,plankv 2110:Iscr,imagline 2111:Ifr,Im,image,imagpart 2112:Laplacetrf,Lscr,lagran 2113:ell 2115:Nopf,naturals 2116:numero 2117:copysr 2118:weierp,wp 2119:Popf,primes 211a:Qopf,rationals 211b:Rscr,realine 211c:Re,Rfr,real,realpart 211d:Ropf,reals 211e:rx 2122:TRADE,trade 2124:Zopf,integers 2127:mho 2128:Zfr,zeetrf 2129:iiota 212c:Bernoullis,Bscr,bernou 212d:Cayleys,Cfr 212f:escr 2130:Escr,expectation 2131:Fouriertrf,Fscr 2133:Mellintrf,Mscr,phmmat 2134:order,orderof,oscr 2135:alefsym,aleph 2136:beth 2137:gimel 2138:daleth 2145:CapitalDifferentialD,DD 2146:DifferentialD,dd 2147:ExponentialE,ee,exponentiale 2148:ImaginaryI,ii 2153:frac13 2154:frac23 2155:frac15 2156:frac25 2157:frac35 2158:frac45 2159:frac16 215a:frac56 215b:frac18 215c:frac38 215d:frac58 215e:frac78
2190:LeftArrow,ShortLeftArrow,larr,leftarrow,slarr 2191:ShortUpArrow,UpArrow,uarr,uparrow 2192:RightArrow,ShortRightArrow,rarr,rightarrow,srarr 2193:DownArrow,ShortDownArrow,darr,downarrow 2194:LeftRightArrow,harr,leftrightarrow 2195:UpDownArrow,updownarrow,varr 2196:UpperLeftArrow,nwarr,nwarrow 2197:UpperRightArrow,nearr,nearrow 2198:LowerRightArrow,searr,searrow 2199:LowerLeftArrow,swarr,swarrow 219a:nlarr,nleftarrow 219b:nrarr,nrightarrow 219d:rarrw,rightsquigarrow 219d+338:nrarrw 219e:Larr,twoheadleftarrow 219f:Uarr 21a0:Rarr,twoheadrightarrow 21a1:Darr 21a2:larrtl,leftarrowtail 21a3:rarrtl,rightarrowtail 21a4:LeftTeeArrow,mapstoleft 21a5:UpTeeArrow,mapstoup 21a6:RightTeeArrow,map,mapsto 21a7:DownTeeArrow,mapstodown 21a9:hookleftarrow,larrhk 21aa:hookrightarrow,rarrhk 21ab:larrlp,looparrowleft 21ac:rarrlp,looparrowright 21ad:harrw,leftrightsquigarrow 21ae:nharr,nleftrightarrow 21b0:Lsh,lsh 21b1:Rsh,rsh 21b2:ldsh 21b3:rdsh 21b5:crarr 21b6:cularr,curvearrowleft 21b7:curarr,curvearrowright 21ba:circlearrowleft,olarr 21bb:circlearrowright,orarr 21bc:LeftVector,leftharpoonup,lharu 21bd:DownLeftVector,leftharpoondown,lhard 21be:RightUpVector,uharr,upharpoonright 21bf:LeftUpVector,uharl,upharpoonleft 21c0:RightVector,rharu,rightharpoonup 21c1:DownRightVector,rhard,rightharpoondown 21c2:RightDownVector,dharr,downharpoonright 21c3:LeftDownVector,dharl,downharpoonleft 21c4:RightArrowLeftArrow,rightleftarrows,rlarr 21c5:UpArrowDownArrow,udarr 21c6:LeftArrowRightArrow,leftrightarrows,lrarr 21c7:leftleftarrows,llarr 21c8:upuparrows,uuarr 21c9:rightrightarrows,rrarr 21ca:ddarr,downdownarrows 21cb:ReverseEquilibrium,leftrightharpoons,lrhar 21cc:Equilibrium,rightleftharpoons,rlhar 21cd:nLeftarrow,nlArr 21ce:nLeftrightarrow,nhArr 21cf:nRightarrow,nrArr 21d0:DoubleLeftArrow,Leftarrow,lArr 21d1:DoubleUpArrow,Uparrow,uArr 21d2:DoubleRightArrow,Implies,Rightarrow,rArr 21d3:DoubleDownArrow,Downarrow,dArr 21d4:DoubleLeftRightArrow,Leftrightarrow,hArr,iff 21d5:DoubleUpDownArrow,Updownarrow,vArr 21d6:nwArr 21d7:neArr 21d8:seArr 21d9:swArr 21da:Lleftarrow,lAarr 21db:Rrightarrow,rAarr 21dd:zigrarr 21e4:LeftArrowBar,larrb 21e5:RightArrowBar,rarrb 21f5:DownArrowUpArrow,duarr 21fd:loarr 21fe:roarr 21ff:hoarr
2200:ForAll,forall 2201:comp,complement 2202:PartialD,part 2202+338:npart 2203:Exists,exist 2204:NotExists,nexist,nexists 2205:empty,emptyset,emptyv,varnothing 2207:Del,nabla 2208:Element,in,isin,isinv 2209:NotElement,notin,notinva 220b:ReverseElement,SuchThat,ni,niv 220c:NotReverseElement,notni,notniva 220f:Product,prod 2210:Coproduct,coprod 2211:Sum,sum 2212:minus 2213:MinusPlus,mnplus,mp 2214:dotplus,plusdo 2216:Backslash,setminus,setmn,smallsetminus,ssetmn 2217:lowast 2218:SmallCircle,compfn 221a:Sqrt,radic 221d:Proportional,prop,propto,varpropto,vprop 221e:infin 221f:angrt 2220:ang,angle 2220+20d2:nang 2221:angmsd,measuredangle 2222:angsph 2223:VerticalBar,mid,shortmid,smid 2224:NotVerticalBar,nmid,nshortmid,nsmid 2225:DoubleVerticalBar,par,parallel,shortparallel,spar 2226:NotDoubleVerticalBar,npar,nparallel,nshortparallel,nspar 2227:and,wedge 2228:or,vee 2229:cap 2229+fe00:caps 222a:cup 222a+fe00:cups 222b:Integral,int 222c:Int 222d:iiint,tint 222e:ContourIntegral,conint,oint 222f:Conint,DoubleContourIntegral 2230:Cconint 2231:cwint 2232:ClockwiseContourIntegral,cwconint 2233:CounterClockwiseContourIntegral,awconint 2234:Therefore,there4,therefore 2235:Because,becaus,because 2236:ratio 2237:Colon,Proportion 2238:dotminus,minusd 223a:mDDot 223b:homtht 223c:Tilde,sim,thicksim,thksim 223c+20d2:nvsim 223d:backsim,bsim 223d+331:race 223e:ac,mstpos 223e+333:acE 223f:acd
2240:VerticalTilde,wr,wreath 2241:NotTilde,nsim 2242:EqualTilde,eqsim,esim 2242+338:NotEqualTilde,nesim 2243:TildeEqual,sime,simeq 2244:NotTildeEqual,nsime,nsimeq 2245:TildeFullEqual,cong 2246:simne 2247:NotTildeFullEqual,ncong 2248:TildeTilde,ap,approx,asymp,thickapprox,thkap 2249:NotTildeTilde,nap,napprox 224a:ape,approxeq 224b:apid 224b+338:napid 224c:backcong,bcong 224d:CupCap,asympeq 224d+20d2:nvap 224e:Bumpeq,HumpDownHump,bump 224e+338:NotHumpDownHump,nbump 224f:HumpEqual,bumpe,bumpeq 224f+338:NotHumpEqual,nbumpe 2250:DotEqual,doteq,esdot 2250+338:nedot 2251:doteqdot,eDot 2252:efDot,fallingdotseq 2253:erDot,risingdotseq 2254:Assign,colone,coloneq 2255:ecolon,eqcolon 2256:ecir,eqcirc 2257:circeq,cire 2259:wedgeq 225a:veeeq 225c:triangleq,trie 225f:equest,questeq 2260:NotEqual,ne 2261:Congruent,equiv 2261+20e5:bnequiv 2262:NotCongruent,nequiv 2264:le,leq 2264+20d2:nvle 2265:GreaterEqual,ge,geq 2265+20d2:nvge 2266:LessFullEqual,lE,leqq 2266+338:nlE,nleqq 2267:GreaterFullEqual,gE,geqq 2267+338:NotGreaterFullEqual,ngE,ngeqq 2268:lnE,lneqq 2268+fe00:lvertneqq,lvnE 2269:gnE,gneqq 2269+fe00:gvertneqq,gvnE 226a:Lt,NestedLessLess,ll 226a+338:NotLessLess,nLtv 226a+20d2:nLt 226b:Gt,NestedGreaterGreater,gg 226b+338:NotGreaterGreater,nGtv 226b+20d2:nGt 226c:between,twixt 226d:NotCupCap 226e:NotLess,nless,nlt 226f:NotGreater,ngt,ngtr
2270:NotLessEqual,nle,nleq 2271:NotGreaterEqual,nge,ngeq 2272:LessTilde,lesssim,lsim 2273:GreaterTilde,gsim,gtrsim 2274:NotLessTilde,nlsim 2275:NotGreaterTilde,ngsim 2276:LessGreater,lessgtr,lg 2277:GreaterLess,gl,gtrless 2278:NotLessGreater,ntlg 2279:NotGreaterLess,ntgl 227a:Precedes,pr,prec 227b:Succeeds,sc,succ 227c:PrecedesSlantEqual,prcue,preccurlyeq 227d:SucceedsSlantEqual,sccue,succcurlyeq 227e:PrecedesTilde,precsim,prsim 227f:SucceedsTilde,scsim,succsim 227f+338:NotSucceedsTilde 2280:NotPrecedes,npr,nprec 2281:NotSucceeds,nsc,nsucc 2282:sub,subset 2282+20d2:NotSubset,nsubset,vnsub 2283:Superset,sup,supset 2283+20d2:NotSuperset,nsupset,vnsup 2284:nsub 2285:nsup 2286:SubsetEqual,sube,subseteq 2287:SupersetEqual,supe,supseteq 2288:NotSubsetEqual,nsube,nsubseteq 2289:NotSupersetEqual,nsupe,nsupseteq 228a:subne,subsetneq 228a+fe00:varsubsetneq,vsubne 228b:supne,supsetneq 228b+fe00:varsupsetneq,vsupne 228d:cupdot 228e:UnionPlus,uplus 228f:SquareSubset,sqsub,sqsubset 228f+338:NotSquareSubset 2290:SquareSuperset,sqsup,sqsupset 2290+338:NotSquareSuperset 2291:SquareSubsetEqual,sqsube,sqsubseteq 2292:SquareSupersetEqual,sqsupe,sqsupseteq 2293:SquareIntersection,sqcap 2293+fe00:sqcaps 2294:SquareUnion,sqcup 2294+fe00:sqcups 2295:CirclePlus,oplus 2296:CircleMinus,ominus 2297:CircleTimes,otimes 2298:osol 2299:CircleDot,odot 229a:circledcirc,ocir 229b:circledast,oast 229d:circleddash,odash 229e:boxplus,plusb 229f:boxminus,minusb
22a0:boxtimes,timesb 22a1:dotsquare,sdotb 22a2:RightTee,vdash 22a3:LeftTee,dashv 22a4:DownTee,top 22a5:UpTee,bot,bottom,perp 22a7:models 22a8:DoubleRightTee,vDash 22a9:Vdash 22aa:Vvdash 22ab:VDash 22ac:nvdash 22ad:nvDash 22ae:nVdash 22af:nVDash 22b0:prurel 22b2:LeftTriangle,vartriangleleft,vltri 22b3:RightTriangle,vartriangleright,vrtri 22b4:LeftTriangleEqual,ltrie,trianglelefteq 22b4+20d2:nvltrie 22b5:RightTriangleEqual,rtrie,trianglerighteq 22b5+20d2:nvrtrie 22b6:origof 22b7:imof 22b8:multimap,mumap 22b9:hercon 22ba:intcal,intercal 22bb:veebar 22bd:barvee 22be:angrtvb 22bf:lrtri 22c0:Wedge,bigwedge,xwedge 22c1:Vee,bigvee,xvee 22c2:Intersection,bigcap,xcap 22c3:Union,bigcup,xcup 22c4:Diamond,diam,diamond 22c5:sdot 22c6:Star,sstarf 22c7:divideontimes,divonx 22c8:bowtie 22c9:ltimes 22ca:rtimes 22cb:leftthreetimes,lthree 22cc:rightthreetimes,rthree 22cd:backsimeq,bsime 22ce:curlyvee,cuvee 22cf:curlywedge,cuwed 22d0:Sub,Subset 22d1:Sup,Supset 22d2:Cap 22d3:Cup 22d4:fork,pitchfork 22d5:epar 22d6:lessdot,ltdot 22d7:gtdot,gtrdot 22d8:Ll 22d8+338:nLl 22d9:Gg,ggg 22d9+338:nGg 22da:LessEqualGreater,leg,lesseqgtr 22da+fe00:lesg 22db:GreaterEqualLess,gel,gtreqless 22db+fe00:gesl 22de:cuepr,curlyeqprec 22df:cuesc,curlyeqsucc 22e0:NotPrecedesSlantEqual,nprcue 22e1:NotSucceedsSlantEqual,nsccue 22e2:NotSquareSubsetEqual,nsqsube 22e3:NotSquareSupersetEqual,nsqsupe 22e6:lnsim 22e7:gnsim 22e8:precnsim,prnsim 22e9:scnsim,succnsim 22ea:NotLeftTriangle,nltri,ntriangleleft 22eb:NotRightTriangle,nrtri,ntriangleright 22ec:NotLeftTriangleEqual,nltrie,ntrianglelefteq 22ed:NotRightTriangleEqual,nrtrie,ntrianglerighteq 22ee:vellip 22ef:ctdot 22f0:utdot 22f1:dtdot 22f2:disin 22f3:isinsv 22f4:isins 22f5:isindot 22f5+338:notindot 22f6:notinvc 22f7:notinvb 22f9:isinE 22f9+338:notinE 22fa:nisd 22fb:xnis 22fc:nis 22fd:notnivc 22fe:notnivb
2305:barwed,barwedge 2306:Barwed,doublebarwedge 2308:LeftCeiling,lceil 2309:RightCeiling,rceil 230a:LeftFloor,lfloor 230b:RightFloor,rfloor 230c:drcrop 230d:dlcrop 230e:urcrop 230f:ulcrop 2310:bnot 2312:profline 2313:profsurf 2315:telrec 2316:target 231c:ulcorn,ulcorner 231d:urcorn,urcorner 231e:dlcorn,llcorner 231f:drcorn,lrcorner 2322:frown,sfrown 2323:smile,ssmile 232d:cylcty 232e:profalar 2336:topbot 233d:ovbar 233f:solbar 237c:angzarr 23b0:lmoust,lmoustache 23b1:rmoust,rmoustache 23b4:OverBracket,tbrk 23b5:UnderBracket,bbrk 23b6:bbrktbrk 23dc:OverParenthesis 23dd:UnderParenthesis 23de:OverBrace 23df:UnderBrace 23e2:trpezium 23e7:elinters 2423:blank 24c8:circledS,oS
2500:HorizontalLine,boxh 2502:boxv 250c:boxdr 2510:boxdl 2514:boxur 2518:boxul 251c:boxvr 2524:boxvl 252c:boxhd 2534:boxhu 253c:boxvh 2550:boxH 2551:boxV 2552:boxdR 2553:boxDr 2554:boxDR 2555:boxdL 2556:boxDl 2557:boxDL 2558:boxuR 2559:boxUr 255a:boxUR 255b:boxuL 255c:boxUl 255d:boxUL 255e:boxvR 255f:boxVr 2560:boxVR 2561:boxvL 2562:boxVl 2563:boxVL 2564:boxHd 2565:boxhD 2566:boxHD 2567:boxHu 2568:boxhU 2569:boxHU 256a:boxvH 256b:boxVh 256c:boxVH 2580:uhblk 2584:lhblk 2588:block 2591:blk14 2592:blk12 2593:blk34 25a1:Square,squ,square 25aa:FilledVerySmallSquare,blacksquare,squarf,squf 25ab:EmptyVerySmallSquare 25ad:rect 25ae:marker 25b1:fltns 25b3:bigtriangleup,xutri 25b4:blacktriangle,utrif 25b5:triangle,utri 25b8:blacktriangleright,rtrif 25b9:rtri,triangleright 25bd:bigtriangledown,xdtri 25be:blacktriangledown,dtrif 25bf:dtri,triangledown 25c2:blacktriangleleft,ltrif 25c3:ltri,triangleleft 25ca:loz,lozenge 25cb:cir 25ec:tridot 25ef:bigcirc,xcirc 25f8:ultri 25f9:urtri 25fa:lltri 25fb:EmptySmallSquare 25fc:FilledSmallSquare
2605:bigstar,starf 2606:star 260e:phone 2640:female 2642:male 2660:spades,spadesuit 2663:clubs,clubsuit 2665:hearts,heartsuit 2666:diamondsuit,diams 266a:sung 266d:flat 266e:natur,natural 266f:sharp 2713:check,checkmark 2717:cross 2720:malt,maltese 2736:sext 2758:VerticalSeparator 2772:lbbrk 2773:rbbrk 27c8:bsolhsub 27c9:suphsol 27e6:LeftDoubleBracket,lobrk 27e7:RightDoubleBracket,robrk 27e8:LeftAngleBracket,lang,langle 27e9:RightAngleBracket,rang,rangle 27ea:Lang 27eb:Rang 27ec:loang 27ed:roang 27f5:LongLeftArrow,longleftarrow,xlarr 27f6:LongRightArrow,longrightarrow,xrarr 27f7:LongLeftRightArrow,longleftrightarrow,xharr 27f8:DoubleLongLeftArrow,Longleftarrow,xlArr 27f9:DoubleLongRightArrow,Longrightarrow,xrArr 27fa:DoubleLongLeftRightArrow,Longleftrightarrow,xhArr 27fc:longmapsto,xmap 27ff:dzigrarr
2902:nvlArr 2903:nvrArr 2904:nvHarr 2905:Map 290c:lbarr 290d:bkarow,rbarr 290e:lBarr 290f:dbkarow,rBarr 2910:RBarr,drbkarow 2911:DDotrahd 2912:UpArrowBar 2913:DownArrowBar 2916:Rarrtl 2919:latail 291a:ratail 291b:lAtail 291c:rAtail 291d:larrfs 291e:rarrfs 291f:larrbfs 2920:rarrbfs 2923:nwarhk 2924:nearhk 2925:hksearow,searhk 2926:hkswarow,swarhk 2927:nwnear 2928:nesear,toea 2929:seswar,tosa 292a:swnwar 2933:rarrc 2933+338:nrarrc 2935:cudarrr 2936:ldca 2937:rdca 2938:cudarrl 2939:larrpl 293c:curarrm 293d:cularrp 2945:rarrpl 2948:harrcir 2949:Uarrocir 294a:lurdshar 294b:ldrushar 294e:LeftRightVector 294f:RightUpDownVector 2950:DownLeftRightVector 2951:LeftUpDownVector 2952:LeftVectorBar 2953:RightVectorBar 2954:RightUpVectorBar 2955:RightDownVectorBar 2956:DownLeftVectorBar 2957:DownRightVectorBar 2958:LeftUpVectorBar 2959:LeftDownVectorBar 295a:LeftTeeVector 295b:RightTeeVector 295c:RightUpTeeVector 295d:RightDownTeeVector 295e:DownLeftTeeVector 295f:DownRightTeeVector 2960:LeftUpTeeVector 2961:LeftDownTeeVector 2962:LeftDownTeeVector 2962:lHar 2963:uHar 2964:rHar 2965:dHar 2966:luruhar 2967:ldrdhar 2968:ruluhar 2969:rdldhar 296a:lharul 296b:llhard 296c:rharul 296d:lrhard 296e:UpEquilibrium,udhar 296f:ReverseUpEquilibrium,duhar 2970:RoundImplies 2971:erarr 2972:simrarr 2973:larrsim 2974:rarrsim 2975:rarrap 2976:ltlarr 2978:gtrarr 2979:subrarr 297b:suplarr 297c:lfisht 297d:rfisht 297e:ufisht 297f:dfisht
2985:lopar 2986:ropar 298b:lbrke 298c:rbrke 298d:lbrkslu 298e:rbrksld 298f:lbrksld 2990:rbrkslu 2991:langd 2992:rangd 2993:lparlt 2994:rpargt 2995:gtlPar 2996:ltrPar 299a:vzigzag 299c:vangrt 299d:angrtvbd 29a4:ange 29a5:range 29a6:dwangle 29a7:uwangle 29a8:angmsdaa 29a9:angmsdab 29aa:angmsdac 29ab:angmsdad 29ac:angmsdae 29ad:angmsdaf 29ae:angmsdag 29af:angmsdah 29b0:bemptyv 29b1:demptyv 29b2:cemptyv 29b3:raemptyv 29b4:laemptyv 29b5:ohbar 29b6:omid 29b7:opar 29b9:operp 29bb:olcross 29bc:odsold 29be:olcir 29bf:ofcir 29c0:olt 29c1:ogt 29c2:cirscir 29c3:cirE 29c4:solb 29c5:bsolb 29c9:boxbox 29cd:trisb 29ce:rtriltri 29cf:LeftTriangleBar 29cf+338:NotLeftTriangleBar 29d0:RightTriangleBar 29d0+338:NotRightTriangleBar 29dc:iinfin 29dd:infintie 29de:nvinfin 29e3:eparsl 29e4:smeparsl 29e5:eqvparsl 29eb:blacklozenge,lozf 29f4:RuleDelayed 29f6:dsol
2a00:bigodot,xodot 2a01:bigoplus,xoplus 2a02:bigotimes,xotime 2a04:biguplus,xuplus 2a06:bigsqcup,xsqcup 2a0c:iiiint,qint 2a0d:fpartint 2a10:cirfnint 2a11:awint 2a12:rppolint 2a13:scpolint 2a14:npolint 2a15:pointint 2a16:quatint 2a17:intlarhk 2a22:pluscir 2a23:plusacir 2a24:simplus 2a25:plusdu 2a26:plussim 2a27:plustwo 2a29:mcomma 2a2a:minusdu 2a2d:loplus 2a2e:roplus 2a2f:Cross 2a30:timesd 2a31:timesbar 2a33:smashp 2a34:lotimes 2a35:rotimes 2a36:otimesas 2a37:Otimes 2a38:odiv 2a39:triplus 2a3a:triminus 2a3b:tritime 2a3c:intprod,iprod 2a3f:amalg 2a40:capdot 2a42:ncup 2a43:ncap 2a44:capand 2a45:cupor 2a46:cupcap 2a47:capcup 2a48:cupbrcap 2a49:capbrcup 2a4a:cupcup 2a4b:capcap 2a4c:ccups 2a4d:ccaps 2a50:ccupssm 2a53:And 2a54:Or 2a55:andand 2a56:oror 2a57:orslope 2a58:andslope 2a5a:andv 2a5b:orv 2a5c:andd 2a5d:ord 2a5f:wedbar 2a66:sdote 2a6a:simdot 2a6d:congdot 2a6d+338:ncongdot 2a6e:easter 2a6f:apacir 2a70:apE 2a70+338:napE 2a71:eplus 2a72:pluse 2a73:Esim 2a74:Colone 2a75:Equal 2a77:ddotseq,eDDot 2a78:equivDD 2a79:ltcir 2a7a:gtcir 2a7b:ltquest 2a7c:gtquest
2a7d:LessSlantEqual,leqslant,les 2a7d+338:NotLessSlantEqual,nleqslant,nles 2a7e:GreaterSlantEqual,geqslant,ges 2a7e+338:NotGreaterSlantEqual,ngeqslant,nges 2a7f:lesdot 2a80:gesdot 2a81:lesdoto 2a82:gesdoto 2a83:lesdotor 2a84:gesdotol 2a85:lap,lessapprox 2a86:gap,gtrapprox 2a87:lne,lneq 2a88:gne,gneq 2a89:lnap,lnapprox 2a8a:gnap,gnapprox 2a8b:lEg,lesseqqgtr 2a8c:gEl,gtreqqless 2a8d:lsime 2a8e:gsime 2a8f:lsimg 2a90:gsiml 2a91:lgE 2a92:glE 2a93:lesges 2a94:gesles 2a95:els,eqslantless 2a96:egs,eqslantgtr 2a97:elsdot 2a98:egsdot 2a99:el 2a9a:eg 2a9d:siml 2a9e:simg 2a9f:simlE 2aa0:simgE 2aa1:LessLess 2aa1+338:NotNestedLessLess 2aa2:GreaterGreater 2aa2+338:NotNestedGreaterGreater 2aa4:glj 2aa5:gla 2aa6:ltcc 2aa7:gtcc 2aa8:lescc 2aa9:gescc 2aaa:smt 2aab:lat 2aac:smte 2aac+fe00:smtes 2aad:late 2aad+fe00:lates 2aae:bumpE 2aaf:PrecedesEqual,pre,preceq 2aaf+338:NotPrecedesEqual,npre,npreceq 2ab0:SucceedsEqual,sce,succeq 2ab0+338:NotSucceedsEqual,nsce,nsucceq 2ab3:prE 2ab4:scE 2ab5:precneqq,prnE 2ab6:scnE,succneqq 2ab7:prap,precapprox 2ab8:scap,succapprox 2ab9:precnapprox,prnap 2aba:scnap,succnapprox 2abb:Pr 2abc:Sc 2abd:subdot 2abe:supdot 2abf:subplus 2ac0:supplus 2ac1:submult 2ac2:supmult 2ac3:subedot 2ac4:supedot 2ac5:subE,subseteqq 2ac5+338:nsubE,nsubseteqq 2ac6:supE,supseteqq 2ac6+338:nsupE,nsupseteqq 2ac7:subsim 2ac8:supsim 2acb:subnE,subsetneqq 2acb+fe00:varsubsetneqq,vsubnE 2acc:supnE,supsetneqq 2acc+fe00:varsupsetneqq,vsupnE 2acf:csub 2ad0:csup 2ad1:csube 2ad2:csupe 2ad3:subsup 2ad4:supsub 2ad5:subsub 2ad6:supsup 2ad7:suphsub 2ad8:supdsub 2ad9:forkv 2ada:topfork 2adb:mlcp 2ae4:Dashv,DoubleLeftTee 2ae6:Vdashl 2ae7:Barv 2ae8:vBar 2ae9:vBarv 2aeb:Vbar 2aec:Not 2aed:bNot 2aee:rnmid 2aef:cirmid 2af0:midcir 2af1:topcir 2af2:nhpar 2af3:parsim 2afd:parsl 2afd+20e5:nparsl
fb00:fflig fb01:filig fb02:fllig fb03:ffilig fb04:ffllig
1d49c:Ascr 1d49e:Cscr 1d49f:Dscr 1d4a2:Gscr 1d4a5:Jscr 1d4a6:Kscr 1d4a9:Nscr 1d4aa:Oscr 1d4ab:Pscr 1d4ac:Qscr 1d4ae:Sscr 1d4af:Tscr 1d4b0:Uscr 1d4b1:Vscr 1d4b2:Wscr 1d4b3:Xscr 1d4b4:Yscr 1d4b5:Zscr 1d4b6:ascr 1d4b7:bscr 1d4b8:cscr 1d4b9:dscr 1d4bb:fscr 1d4bd:hscr 1d4be:iscr 1d4bf:jscr 1d4c0:kscr 1d4c1:lscr 1d4c2:mscr 1d4c3:nscr 1d4c5:pscr 1d4c6:qscr 1d4c7:rscr 1d4c8:sscr 1d4c9:tscr 1d4ca:uscr 1d4cb:vscr 1d4cc:wscr 1d4cd:xscr 1d4ce:yscr 1d4cf:zscr
1d504:Afr 1d505:Bfr 1d507:Dfr 1d508:Efr 1d509:Ffr 1d50a:Gfr 1d50d:Jfr 1d50e:Kfr 1d50f:Lfr 1d510:Mfr 1d511:Nfr 1d512:Ofr 1d513:Pfr 1d514:Qfr 1d516:Sfr 1d517:Tfr 1d518:Ufr 1d519:Vfr 1d51a:Wfr 1d51b:Xfr 1d51c:Yfr 1d51e:Zfr 1d51f:afr 1d520:bfr 1d521:cfr 1d522:dfr 1d523:efr 1d524:ffr 1d525:gfr 1d526:hfr 1d527:ifr 1d528:jfr 1d529:kfr 1d52a:lfr 1d52b:mfr 1d52c:nfr 1d52d:ofr 1d52e:pfr 1d52f:qfr 1d530:rfr 1d531:sfr 1d532:tfr 1d533:ufr 1d534:vfr 1d535:wfr 1d536:xfr 1d537:yfr 1d538:zfr
1d538:Aopf 1d539:Bopf 1d53b:Dopf 1d53c:Eopf 1d53d:Fopf 1d53e:Gopf 1d540:Iopf 1d541:Jopf 1d542:Kopf 1d543:Lopf 1d544:Mopf 1d546:Oopf 1d54a:Sopf 1d54b:Topf 1d54c:Uopf 1d54d:Vopf 1d54e:Wopf 1d54f:Xopf 1d550:Yopf 1d552:aopf 1d553:bopf 1d554:copf 1d555:dopf 1d556:eopf 1d557:fopf 1d558:gopf 1d559:hopf 1d55a:iopf 1d55b:jopf 1d55c:kopf 1d55d:lopf 1d55e:mopf 1d55f:nopf 1d560:oopf 1d561:popf 1d562:qopf 1d563:ropf 1d564:sopf 1d565:topf 1d566:uopf 1d567:vopf 1d568:wopf 1d569:xopf 1d56a:yopf 1d56b:zopf
`;

const namedEntities = new Map();
for (const entry of ENTITY_TABLE.trim().split(/\s+/)) {
  const [codes, names] = entry.split(':');
  const value = String.fromCodePoint(...codes.split('+').map((code) => parseInt(code, 16)));
  for (const name of names.split(',')) namedEntities.set(name, value);
}

// HTML でセミコロンを省略できる名前。
const legacyEntities = new Set(`
AElig AMP Aacute Acirc Agrave Aring Atilde Auml COPY Ccedil ETH Eacute Ecirc Egrave Euml GT Iacute Icirc Igrave Iuml LT Ntilde Oacute Ocirc Ograve Oslash Otilde Ouml QUOT REG THORN Uacute Ucirc Ugrave Uuml Yacute aacute acirc acute aelig agrave amp aring atilde auml brvbar ccedil cedil cent copy curren deg divide eacute ecirc egrave eth euml frac12 frac14 frac34 gt iacute icirc iexcl igrave iquest iuml laquo lt macr micro middot nbsp not ntilde oacute ocirc ograve ordf ordm oslash otilde ouml para plusmn pound quot raquo reg sect shy sup1 sup2 sup3 szlig thorn times uacute ucirc ugrave uml uuml yacute yen yuml
`.trim().split(/\s+/));

// HTML の数値参照に適用される Windows-1252 の置換。
const numericReplacements = new Map([
  [0x80, 0x20ac], [0x82, 0x201a], [0x83, 0x0192], [0x84, 0x201e],
  [0x85, 0x2026], [0x86, 0x2020], [0x87, 0x2021], [0x88, 0x02c6],
  [0x89, 0x2030], [0x8a, 0x0160], [0x8b, 0x2039], [0x8c, 0x0152],
  [0x8e, 0x017d], [0x91, 0x2018], [0x92, 0x2019], [0x93, 0x201c],
  [0x94, 0x201d], [0x95, 0x2022], [0x96, 0x2013], [0x97, 0x2014],
  [0x98, 0x02dc], [0x99, 0x2122], [0x9a, 0x0161], [0x9b, 0x203a],
  [0x9c, 0x0153], [0x9e, 0x017e], [0x9f, 0x0178],
]);

function decodeHtml(value, attribute = false) {
  return value.replace(
    /&(#(?:[xX][0-9a-fA-F]+|\d+);?|[A-Za-z][A-Za-z0-9]*;?)/g,
    (match, reference, offset, input) => {
      const hasSemicolon = reference.endsWith(';');
      const name = hasSemicolon ? reference.slice(0, -1) : reference;

      if (name.startsWith('#')) {
        const hexadecimal = /^#[xX]/.test(name);
        let code = parseInt(name.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        if (!Number.isFinite(code) || code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
          return '\ufffd';
        }
        code = numericReplacements.get(code) ?? code;
        return String.fromCodePoint(code);
      }

      if (hasSemicolon && namedEntities.has(name)) return namedEntities.get(name);

      for (let length = name.length; length > 0; length--) {
        const prefix = name.slice(0, length);
        if (!legacyEntities.has(prefix)) continue;
        const tail = name.slice(length) + (hasSemicolon ? ';' : '');
        const following = tail[0] ?? input[offset + match.length] ?? '';
        if (attribute && /^[=A-Za-z0-9]$/.test(following)) return match;
        return namedEntities.get(prefix) + tail;
      }

      return match;
    },
  );
}

function readAttributes(raw, tagName) {
  const attributes = Object.create(null);
  const source = raw.slice(1 + tagName.length, -1);
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    if (Object.prototype.hasOwnProperty.call(attributes, name)) continue;
    attributes[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '', true);
  }
  return attributes;
}

// 指定された section / article / 見出しの包含関係を読むための小さな HTML 走査。
// コメントと script / style の中身は要素として扱わない。
function parseHtml(html, htmlIds = new Set()) {
  const root = { tag: '', attributes: Object.create(null), children: [] };
  const stack = [root];
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  const tags = /<!--[\s\S]*?-->|<![^>]*>|<\/?([A-Za-z][A-Za-z0-9:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/g;
  let cursor = 0;
  let match;

  while ((match = tags.exec(html)) !== null) {
    if (match.index > cursor) stack[stack.length - 1].children.push(html.slice(cursor, match.index));
    cursor = tags.lastIndex;

    if (!match[1]) continue;

    const raw = match[0];
    const tag = match[1].toLowerCase();

    if (raw.startsWith('</')) {
      for (let index = stack.length - 1; index > 0; index--) {
        if (stack[index].tag !== tag) continue;
        stack.length = index;
        break;
      }
      continue;
    }

    const attributes = readAttributes(raw, match[1]);
    const id = attributes.id?.trim();
    if (id) htmlIds.add(id);

    if (tag === 'script' || tag === 'style') {
      const closing = new RegExp(`</${tag}\\s*>`, 'gi');
      closing.lastIndex = tags.lastIndex;
      const end = closing.exec(html);
      if (!end) throw new Error(`${tag} の終了タグがありません。`);
      tags.lastIndex = closing.lastIndex;
      cursor = tags.lastIndex;
      continue;
    }

    const node = { tag, attributes, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!voidTags.has(tag) && !/\/\s*>$/.test(raw)) stack.push(node);
  }

  if (cursor < html.length) stack[stack.length - 1].children.push(html.slice(cursor));
  return root;
}

function* descendants(node, stopAtSections = false) {
  for (const child of node.children) {
    if (typeof child === 'string') continue;
    if (stopAtSections && child.tag === 'section') continue;
    yield child;
    yield* descendants(child, stopAtSections);
  }
}

function textContent(node) {
  if (node.tag === 'br') return ' ';
  return node.children.map((child) => typeof child === 'string' ? child : textContent(child)).join('');
}

function text(node) {
  return node ? decodeHtml(textContent(node)).replace(/\s+/g, ' ').trim() : '';
}

const isItem = (node) =>
  node.tag === 'article' && (node.attributes.class ?? '').split(/\s+/).includes('item');

function extract(html, previousIds = []) {
  const htmlIds = new Set();
  const root = parseHtml(html, htmlIds);
  const nodes = [...descendants(root)];
  const categories = [];
  const excluded = [];
  const excludedCategories = new Map();
  const ids = new Set();
  const extractedItemIds = new Set();
  const sections = [];

  // 最も外側の除外分類を、入れ子の section にも引き継ぐ。
  function collectSections(node, excludedSection = null) {
    if (node.tag === 'section') {
      if (!excludedSection && EXCLUDED_IDS.has(node.attributes.id?.trim())) excludedSection = node;
      sections.push({ section: node, excludedSection });
    }
    for (const child of node.children) {
      if (typeof child !== 'string') collectSections(child, excludedSection);
    }
  }
  collectSections(root);

  function uniqueId(node, kind) {
    const id = node.attributes.id?.trim();
    if (!id) throw new Error(`${kind}に id がありません。`);
    if (ids.has(id)) throw new Error(`id が重複しています: ${id}`);
    ids.add(id);
    return id;
  }

  for (const { section, excludedSection } of sections) {
    // カードは最も近い section だけで処理し、二重に数えない。
    const contents = [...descendants(section, true)];
    const articles = contents.filter(isItem);
    if (articles.length === 0) continue;

    const id = uniqueId(section, '分類');
    const name = text(contents.find((node) => node.tag === 'h2'));
    if (!name) throw new Error(`分類 ${id} の最初の h2 が空か、見つかりません。`);

    const items = articles.map((article) => {
      const itemId = uniqueId(article, '機器');
      const contents = [...descendants(article)];
      const itemName = text(contents.find((node) => node.tag === 'h3'));
      if (!itemName) throw new Error(`機器 ${itemId} の h3 が空か、見つかりません。`);
      const price = text(contents.find((node) => (node.attributes.class ?? '').includes('price')));
      extractedItemIds.add(itemId);
      return { id: itemId, name: itemName, price };
    });

    if (excludedSection) {
      let entry = excludedCategories.get(excludedSection);
      if (!entry) {
        const excludedId = excludedSection === section ? id : uniqueId(excludedSection, '分類');
        const excludedName = excludedSection === section ? name : text(
          [...descendants(excludedSection, true)].find((node) => node.tag === 'h2'),
        );
        if (!excludedName) throw new Error(`分類 ${excludedId} の最初の h2 が空か、見つかりません。`);
        entry = { id: excludedId, name: excludedName, count: 0, kind: 'category' };
        excludedCategories.set(excludedSection, entry);
        excluded.push(entry);
      }
      entry.count += items.length;
    } else {
      for (const item of items.filter((x) => EXCLUDED_ITEM_IDS.has(x.id))) {
        excluded.push({ id: item.id, name: item.name, count: 1, kind: 'item' });
      }
      categories.push({ id, name, items: items.filter((x) => !EXCLUDED_ITEM_IDS.has(x.id)) });
    }
  }

  // 既存 id が HTML に残る限り、抽出失敗を削除として受け入れない。
  // 除外したカードも extractedItemIds に含め、掲載先の変更と欠落を区別する。
  const unextractedIds = previousIds.filter((id) => htmlIds.has(id) && !extractedItemIds.has(id));
  if (unextractedIds.length > 0) {
    throw new Error(`HTML に残っている既存機器を抽出できません: ${JSON.stringify(unextractedIds)}`);
  }

  // class="item" とは独立に全 article 要素を数えて照合する。
  const articleCount = nodes.filter((node) => node.tag === 'article').length;
  const itemCount = categories.reduce((sum, category) => sum + category.items.length, 0);
  const excludedCount = excluded.reduce((sum, entry) => sum + entry.count, 0);
  if (itemCount + excludedCount !== articleCount) {
    throw new Error(`機器数が一致しません: HTML の article ${articleCount} 件、掲載 + 除外 ${itemCount + excludedCount} 件`);
  }

  if (categories.length < 20 || itemCount < 200) {
    throw new Error(`形状チェック失敗: 掲載分類 ${categories.length}、掲載機器 ${itemCount}（最低 20 分類・200 件）`);
  }

  return {
    catalog: {
      source: SOURCE,
      fetchedAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
      excluded,
      categories,
    },
    deletedIds: previousIds.filter((id) => !htmlIds.has(id)),
  };
}

async function readOptionalJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function itemIds(catalog) {
  if (!catalog || !Array.isArray(catalog.categories)) throw new Error('既存の分類データの形状が不正です。');
  return catalog.categories.flatMap((category) => {
    if (!Array.isArray(category.items)) throw new Error('既存の機器データの形状が不正です。');
    return category.items.map((item) => {
      if (typeof item.id !== 'string' || !item.id) throw new Error('既存の機器 id が不正です。');
      return item.id;
    });
  });
}

function printIds(label, ids) {
  console.log(`${label}（${ids.length} 件）: ${JSON.stringify(ids, null, 2)}`);
}

// 検査済み JSON を同じディレクトリの一時ファイルに書き、最後に置き換える。
async function save(catalog) {
  await mkdir(dirname(OUTPUT), { recursive: true });
  const temporary = `${OUTPUT}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx');
  try {
    try {
      await handle.writeFile(JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    } finally {
      await handle.close();
    }
    await rename(temporary, OUTPUT);
  } finally {
    try {
      await unlink(temporary);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--dry-run')) throw new Error('使い方: node scripts/workshop-extract.mjs [--dry-run]');
  const dryRun = args.includes('--dry-run');

  const previous = await readOptionalJson(OUTPUT, { categories: [] });
  const ja = await readOptionalJson(JAPANESE, { items: {} });
  const previousIds = itemIds(previous);
  const jaItems = ja?.items ?? {};
  if (typeof jaItems !== 'object' || Array.isArray(jaItems)) {
    throw new Error('日本語データの items は id をキーにしたオブジェクトにしてください。');
  }

  const response = await fetch(SOURCE, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; winsmux-wiki-sync)',
      Accept: 'text/html',
    },
  });
  if (!response.ok) throw new Error(`取得失敗: HTTP ${response.status}`);

  const { catalog, deletedIds } = extract(await response.text(), previousIds);
  const currentIds = itemIds(catalog);
  const previousSet = new Set(previousIds);
  const currentSet = new Set(currentIds);
  const untranslated = currentIds.filter((id) =>
    !Object.prototype.hasOwnProperty.call(jaItems, id) ||
    typeof jaItems[id] !== 'string' ||
    !jaItems[id].trim(),
  );

  console.log(`分類数: ${catalog.categories.length}`);
  console.log(`機器数: ${currentIds.length}`);
  const excludedCategories = catalog.excluded.filter((entry) => entry.kind === 'category');
  const excludedItems = catalog.excluded.filter((entry) => entry.kind === 'item');
  console.log(`除外: ${excludedCategories.length} 分類 ${excludedCategories.reduce((sum, entry) => sum + entry.count, 0)} 件、機器 ${excludedItems.reduce((sum, entry) => sum + entry.count, 0)} 件`);
  printIds('追加 id', currentIds.filter((id) => !previousSet.has(id)));
  printIds('削除 id', deletedIds);
  printIds('未訳 id', untranslated);
  printIds('日本語側にだけ残る id', Object.keys(jaItems).filter((id) => !currentSet.has(id)));

  if (dryRun) {
    console.log('--dry-run: 保存しません。');
    return;
  }

  await save(catalog);
  console.log('保存先: data/wiki/workshop.json');
}

await main().catch((error) => {
  console.error(`workshop-extract: ${error.message}`);
  process.exitCode = 1;
});
