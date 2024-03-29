import * as THREE from './threejs/three.module.js';

import {FirstPersonControls, setScore, getScore} from './controls.js';

import {OBJLoader} from './threejs/OBJLoader.js';
import {GLTFLoader} from './threejs/GLTFLoader.js';

import Stats from './threejs/stats.module.js';

var fogshaders = false;//greatly increases performance when false but removes alot of the atmosphere
var varmusic = true;

const raycaster = new THREE.Raycaster();
var collidableMeshList = [];
var clock = new THREE.Clock();

const _NOISE_GLSL = `
//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20201014 (stegu)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}
vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}
float snoise(vec3 v)
{
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;
// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
// Mix final noise value
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
float FBM(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 0.0;
  for (int i = 0; i < 6; ++i) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

class ForestRangerGame {
    constructor() {
        this._InitialiseMenu();
    }

    _InitialiseMenu() {
        THREE.ShaderChunk.fog_fragment = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        vec3 fogOrigin = cameraPosition;
        vec3 fogDirection = normalize(vWorldPosition - fogOrigin);
        float fogDepth = distance(vWorldPosition, fogOrigin);
        // f(p) = fbm( p + fbm( p ) )
        vec3 noiseSampleCoord = vWorldPosition * 0.00025 + vec3(
            0.0, 0.0, fogTime * 0.025);
        float noiseSample = FBM(noiseSampleCoord + FBM(noiseSampleCoord)) * 0.5 + 0.5;
        fogDepth *= mix(noiseSample, 1.0, saturate((fogDepth - 5000.0) / 5000.0));
        fogDepth *= fogDepth;
        float heightFactor = 0.05;
        float fogFactor = heightFactor * exp(-fogOrigin.y * fogDensity) * (
            1.0 - exp(-fogDepth * fogDirection.y * fogDensity)) / fogDirection.y;
        fogFactor = saturate(fogFactor);
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
      #endif`;
      
      THREE.ShaderChunk.fog_pars_fragment = _NOISE_GLSL + `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        uniform float fogTime;
        uniform vec3 fogColor;
        varying vec3 vWorldPosition;
        #ifdef FOG_EXP2
          uniform float fogDensity;
        #else
          uniform float fogNear;
          uniform float fogFar;
        #endif
      #endif`;
      
      THREE.ShaderChunk.fog_vertex = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        vWorldPosition = worldPosition.xyz;
      #endif`;
      
      THREE.ShaderChunk.fog_pars_vertex = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        varying vec3 vWorldPosition;
      #endif`;
      

      this._threejsmenu = new THREE.WebGLRenderer({
        antialias: true,
      });
      this._threejsmenu.shadowMap.enabled = true;
        this._threejsmenu.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejsmenu.setPixelRatio(window.devicePixelRatio);
        this._threejsmenu.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejsmenu.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1280.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 50, 0);

        this._menuscene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0xFFFFFF, 0.4);
        light.position.set(20, 100, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._menuscene.add(light);

        light = new THREE.AmbientLight(0x101010, 0.4);
        this._menuscene.add(light);

        this._shaders = [];
        const _ModifyShader = (s) => {
            this._shaders.push(s);
            s.uniforms.fogTime = {value: 0.0};
        }

        let textArray = [
          new THREE.TextureLoader().load('./resources/px.png'),
          new THREE.TextureLoader().load('./resources/nx.png'),
          new THREE.TextureLoader().load('./resources/py.png'),
          new THREE.TextureLoader().load('./resources/ny.png'),
          new THREE.TextureLoader().load('./resources/pz.png'),
          new THREE.TextureLoader().load('./resources/nz.png'),
        ];
        let matArray = [];
        for (let v = 0; v < 6; v++){
          matArray.push(new THREE.MeshBasicMaterial({
            map: textArray[v],
            side: THREE.BackSide,
          }));
        }
        for (let v = 0; v < 6; v++){
          matArray[v].onBeforeCompile = _ModifyShader;
        }
        
        let skyboxGeo = new THREE.BoxGeometry(640, 640, 640);
        let skybox = new THREE.Mesh( skyboxGeo, matArray );
        this._menuscene.add(skybox);

        const planeSize = 640;
        const planeLoader = new THREE.TextureLoader();
        const planeText = planeLoader.load('./resources/ground.jpg');
        planeText.wrapS = THREE.RepeatWrapping;
        planeText.wrapT = THREE.RepeatWrapping;
        planeText.magFilter = THREE.NearestFilter;
        const repeats = planeSize / 2;
        planeText.repeat.set(repeats, repeats);
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 10, 10);
        const planeMat = new THREE.MeshPhongMaterial({
          map: planeText,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.rotation.x = -Math.PI / 2;
        this._menuscene.add(mesh);

        var objLoader = new OBJLoader();
        objLoader.load('./resources/forest_house.obj', (root) => {
          this._menuscene.add(root);
          root.position.set(0, 0, 0);
          root.rotation.x = -Math.PI / 2;
          root.scale.set(10, 10, 10);
          this._camera.lookAt(root.position);
        });

        objLoader.load('./resources/jeep.obj', (root) => {
          this._menuscene.add(root);
          root.position.set(20, 0, -150);
          //root.rotation.x = -Math.PI / 2;
          root.scale.set(10, 12, 10);
          this._camera.lookAt(root.position);
        });

        var playerLoader = new GLTFLoader();
        playerLoader.load('./resources/ranger.glb', (gltf) => {
            var player = gltf.scene;
            player.position.set(10, 0, -110);
            player.scale.set(0.4, 0.4, 0.4);
            this._menuscene.add(player);
            }
        );

        //try setting loaders to null to increase performance
        objLoader = null;
        playerLoader = null;

        const trunkMat = new THREE.MeshStandardMaterial({color: 0x808080});
        const leavesMat = new THREE.MeshStandardMaterial({color: 0x80FF80});
        const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
        const leavesGeo = new THREE.ConeGeometry(1, 1, 32);
        trunkMat.onBeforeCompile = _ModifyShader;
        leavesMat.onBeforeCompile = _ModifyShader;
        
        const treePoses = [
          {x: -140, y: 50, z: 10},
          {x: -7, y: 50, z: 115},
          {x: 113, y: 50, z: 30},
          {x: 80, y: 50, z: -200},
          {x: 150, y: 50, z: -190},
          {x: -280, y: 50, z: -280},
          {x: -200, y: 50, z: -100},
          {x: -200, y: 50, z: -300},
        ];
        for (let v = 0; v < treePoses.length; v++) {
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          const leaves = new THREE.Mesh(leavesGeo, leavesMat);
          trunk.scale.set(10, (Math.random() + 2.0) * 50.0, 10);
          trunk.position.set(treePoses[v].x, treePoses[v].y, treePoses[v].z);
          leaves.scale.copy(trunk.scale);
          leaves.scale.set(25, trunk.scale.y * 5.0, 25);
          leaves.position.set(
            trunk.position.x,
            leaves.scale.y / 2 + (Math.random() + 10) * 2,
            trunk.position.z);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
          this._menuscene.add(trunk);
          this._menuscene.add(leaves);
        }
        
        
        //trunk.scale.set(20, (Math.random() + 2.0) * 100.0, 20);
        //leaves.scale.set(50, trunk.scale.y * 5.0, 50);

        //const target = document.getElementById('title');
        //target.appendChild(this._threejsmenu.domElement);
        var title = document.createElement('div');
        title.id = 'title';
        document.body.appendChild(title);
	      title.style.cssText = "position:fixed;top:10%;left:40%;cursor:default;opacity:0.9;z-index:10000;font-size:4vw;font-family:'Brush Script MT',cursive;text-decoration:underline;color:red;";
        title.innerText = 'Forest Ranger';

        //const play = document.getElementById('play');
        //play.appendChild(this._threejsmenu.domElement);
        var play = document.createElement('div');
        play.id = 'play';
        document.body.appendChild(play);
        play.style.cssText = "position:fixed;top:25%;left:52%;cursor:pointer;opacity:0.9;z-index:10000;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
        play.innerText = 'Play';
        play.onclick = () => {
          this._play();
        }

        this._audio = new Audio('./resources/atmospheric.mp3');
        this._audio.loop = true;
        if (varmusic) {
          this._audio.play();
        }

        //const music = document.getElementById('settingmusic');
        //music.appendChild(this._threejsmenu.domElement);
        var music = document.createElement('div');
        music.id = 'music';
        document.body.appendChild(music);
        music.style.cssText = "position:fixed;top:30%;left:43%;cursor:pointer;opacity:0.9;z-index:10000;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
        music.innerText = 'Stop background music';
        music.onclick = () => {
          this._audio.pause();
          this._audio.currentTime = 0;
          varmusic = false;
        }
        //const fogsettingon = document.getElementById('settingfogon');
        //fogsettingon.appendChild(this._threejsmenu.domElement);
        var fogsettingon = document.createElement('div');
        fogsettingon.id = 'fogsettingon';
        document.body.appendChild(fogsettingon);
        fogsettingon.style.cssText = "position:fixed;top:35%;left:44%;cursor:pointer;opacity:0.9;z-index:10000;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
        fogsettingon.innerText = 'Turn fog on (in game)';
        fogsettingon.onclick = () => {
          fogshaders = true;
        }

        this._menuscene.fog = new THREE.FogExp2(0xDFE9F3, 0.00055);
        this._totalTime = 0.0;
        this._previousRAF = null;
        this._RAF();
    }

    _play() {
      document.body.replaceChildren();
      this._threejsmenu = null;
      this._menuscene = null;
      this._camera = null;
      this._InitialiseGame();
    }

    _InitialiseGame() {
      THREE.ShaderChunk.fog_fragment = ``;
      THREE.ShaderChunk.fog_pars_fragment = ``;
      THREE.ShaderChunk.fog_pars_vertex = ``;
      THREE.ShaderChunk.fog_vertex = ``;
      if (fogshaders){
      THREE.ShaderChunk.fog_fragment = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        vec3 fogOrigin = cameraPosition;
        vec3 fogDirection = normalize(vWorldPosition - fogOrigin);
        float fogDepth = distance(vWorldPosition, fogOrigin);
        // f(p) = fbm( p + fbm( p ) )
        vec3 noiseSampleCoord = vWorldPosition * 0.00025 + vec3(
            0.0, 0.0, fogTime * 0.025);
        float noiseSample = FBM(noiseSampleCoord + FBM(noiseSampleCoord)) * 0.5 + 0.5;
        fogDepth *= mix(noiseSample, 1.0, saturate((fogDepth - 5000.0) / 5000.0));
        fogDepth *= fogDepth;
        float heightFactor = 0.05;
        float fogFactor = heightFactor * exp(-fogOrigin.y * fogDensity) * (
            1.0 - exp(-fogDepth * fogDirection.y * fogDensity)) / fogDirection.y;
        fogFactor = saturate(fogFactor);
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
      #endif`;
      
      THREE.ShaderChunk.fog_pars_fragment = _NOISE_GLSL + `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        uniform float fogTime;
        uniform vec3 fogColor;
        varying vec3 vWorldPosition;
        #ifdef FOG_EXP2
          uniform float fogDensity;
        #else
          uniform float fogNear;
          uniform float fogFar;
        #endif
      #endif`;
      
      THREE.ShaderChunk.fog_vertex = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        vWorldPosition = worldPosition.xyz;
      #endif`;
      
      THREE.ShaderChunk.fog_pars_vertex = `
      //https://github.com/simondevyoutube/ThreeJS_Tutorial_Fog/blob/main/main.js
      //NOT MINE
      //LICENSE: MIT
      #ifdef USE_FOG
        varying vec3 vWorldPosition;
      #endif`;
      }

        this._threejs = new THREE.WebGLRenderer({
            antialias: true,
        });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 10000.0;//large number so no glitchy skybox, what limits eye range is fog and little light
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 50, 0);

        this._scene = new THREE.Scene();

        this._cameraBox = new THREE.Mesh(
          new THREE.BoxGeometry(5, 5, 5),
          new THREE.MeshBasicMaterial({color: 0x000000})
        );
        this._cameraBox.position.set(75, 50, 0);
        this._cameraBox.name = 'cameraBox';
        this._cameraBox.visible = false;
        this._scene.add(this._cameraBox);


        let light = new THREE.DirectionalLight(0xFFFFFF, 0.2);
        light.position.set(-2580, 2013, -2860);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._scene.add(light);

        light = new THREE.AmbientLight(0x101010, 0.3);
        this._scene.add(light);

        this._shaders = [];
        const _ModifyShader = (s) => {
            this._shaders.push(s);
            s.uniforms.fogTime = {value: 0.0};
        }
      

      let textArray = [
        new THREE.TextureLoader().load('./resources/px.png'),
        new THREE.TextureLoader().load('./resources/nx.png'),
        new THREE.TextureLoader().load('./resources/py.png'),
        new THREE.TextureLoader().load('./resources/ny.png'),
        new THREE.TextureLoader().load('./resources/pz.png'),
        new THREE.TextureLoader().load('./resources/nz.png'),
      ];
      let matArray = [];
      for (let v = 0; v < 6; v++){
        matArray.push(new THREE.MeshBasicMaterial({
          map: textArray[v],
          side: THREE.BackSide,
        }));
      }
      for (let v = 0; v < 6; v++){
        matArray[v].onBeforeCompile = _ModifyShader;
      }
      
      let skyboxGeo = new THREE.BoxGeometry(6400, 6400, 6400);
      let skybox = new THREE.Mesh( skyboxGeo, matArray );
      this._scene.add(skybox);

        
        const planetexture = new THREE.TextureLoader().load('./resources/ground.jpg');
        planetexture.wrapS = planetexture.wrapT = THREE.RepeatWrapping;
        planetexture.repeat.set( 6400, 6400 );
        planetexture.anisotropy = 16;
        planetexture.encoding = THREE.sRGBEncoding;
        var planeMaterial = new THREE.MeshStandardMaterial( { map: planetexture } );
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(6400, 6400, 10, 10),
            planeMaterial
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        const trunkMat = new THREE.MeshStandardMaterial({color: 0x808080});
        const leavesMat = new THREE.MeshStandardMaterial({color: 0x80FF80});
        const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
        const leavesGeo = new THREE.ConeGeometry(1, 1, 32);
        trunkMat.onBeforeCompile = _ModifyShader;
        leavesMat.onBeforeCompile = _ModifyShader;
        for (let x = 0; x < 10; ++x) {
            for (let y = 0; y < 10; ++y) {
              const trunk = new THREE.Mesh(trunkGeo, trunkMat);
              collidableMeshList.push(trunk);
              const leaves = new THREE.Mesh(leavesGeo, leavesMat);
              collidableMeshList.push(leaves);
              trunk.scale.set(20, (Math.random() + 2.0) * 100.0, 20);
              trunk.position.set(
                  3200.0 * (Math.random() * 2.0 - 1.0),
                  trunk.scale.y / 2.0,
                  3200.0 * (Math.random() * 2.0 - 1.0));
      
              leaves.scale.copy(trunk.scale);
              leaves.scale.set(50, trunk.scale.y * 5.0, 50);
              leaves.position.set(
                  trunk.position.x,
                  leaves.scale.y / 2 + (Math.random() + 5) * 25,
                  trunk.position.z);

              trunk.castShadow = true;
              trunk.receiveShadow = true;
              leaves.castShadow = true;
              leaves.receiveShadow = true;
      
              this._scene.add(trunk);
              this._scene.add(leaves);
            }
          }

        var objLoader = new OBJLoader();
        objLoader.load('./resources/zombie.obj', 
          (obj) => {
            var mesh = obj.children[0];
            mesh.rotation.x = -Math.PI / 2;
            mesh.scale.set(4, 4, 4);
            mesh.position.set(getRandomArbitrary(-3200, 3200), 0, getRandomArbitrary(-3200, 3200));
            //mesh.position.set(0, 0, 0);
            this._zombie = mesh;
            this._zombie.name = 'zombie';
            this._scene.add(this._zombie);
            this._controls = new FirstPersonControls(this._camera, this._threejs.domElement, this._zombie, this._scene);
            this._controls.movementSpeed = 100;
            this._controls.lookSpeed = 0.1;
          },
        );

        //try setting loaders to null to increase performance
        objLoader = null;

        var scorediv = document.createElement('div');
        scorediv.id = 'score';
        document.body.appendChild(scorediv);
        scorediv.appendChild(this._threejs.domElement);
	      scorediv.style.cssText = "position:fixed;top:0%;right:0%;cursor:default;opacity:0.9;z-index:10000;font-size:2vw;font-family:'Brush Script MT',cursive;text-decoration:underline;color:red;";
        scorediv.innerText = 'Score: 0';

        var crosshair = document.createElement('div');
        crosshair.id = 'crosshair';
        document.body.appendChild(crosshair);
        crosshair.style.cssText = "position:fixed;top:43%;left:49%;cursor:default;opacity:0.9;z-index:10000;font-size:4vw;color:red;";//font-family:'Brush Script MT',cursive;
        crosshair.innerText = '+';

        var hit = document.createElement('div');
        hit.id = 'hit';
        document.body.appendChild(hit);
        hit.style.cssText = "position:fixed;top:0%;left:49%;cursor:default;opacity:0.9;z-index:0;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
        hit.innerText = '';
        
        var ready = document.createElement('div');
        ready.id = 'ready';
        document.body.appendChild(ready);
        ready.style.cssText = "position:fixed;top:95%;left:0%;cursor:default;opacity:0.9;z-index:0;font-size:1.5vw;font-family:'Brush Script MT',cursive;color:red;";
        ready.innerText = 'Loading your gun...';

        var distance = document.createElement('div');
        distance.id = 'distance';
        document.body.appendChild(distance);
        distance.style.cssText = "position:fixed;top:95%;right:0%;cursor:default;opacity:0.9;z-index:0;font-size:1.5vw;font-family:'Brush Script MT',cursive;color:red;";
        distance.innerText = 'Zombie is _ units away from you.';

        this._scene.fog = new THREE.FogExp2(0xDFE9F3, 0.00005);
        this._totalTime = 0.0;
        this._previousRAF = null;
        this._RAF();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        if (this._threejs) {
          this._threejs.setSize(window.innerWidth, window.innerHeight);
        } else if (this._threejsmenu) {
          this._threejsmenu.setSize(window.innerWidth, window.innerHeight);
        }
      }

    _RAF() {
        requestAnimationFrame((t) => {
          if (this._previousRAF === null) {
            this._previousRAF = t;
            var target = document.getElementById('stats');
            if (!target) {
              var statdiv = document.createElement('div');
               statdiv.id = 'stats';
              document.body.appendChild(statdiv);
            }
            target = document.getElementById('stats');
            if (this._threejs) {
               target.appendChild(this._threejs.domElement);
            } else if (this._threejsmenu) {
              target.appendChild(this._threejsmenu.domElement);
            }
            this._stats = new Stats();
            target.appendChild(this._stats.dom);
            
          }
          this._Step((t - this._previousRAF) * 0.001);
          this._previousRAF = t;
          
          if (this._threejs) {
            this._threejs.render(this._scene, this._camera);
            this._stats.update();
          } else if (this._threejsmenu) {
            this._threejsmenu.render(this._menuscene, this._camera);
            this._stats.update();
          }
          this._RAF();
        });
    }

    _Step(timeElapsed) {
        this._totalTime += timeElapsed;
        for (let s of this._shaders) {
          s.uniforms.fogTime.value = this._totalTime;
        }
        if (this._threejsmenu) {
          //thanks to EliasFleckenstein03 (fleckenstein@elidragon.com) for this
          let a = this._totalTime * Math.PI * 2 * /*0.005*/ 0.01;
          this._camera.position.x = Math.cos(a) * 180 - 100;
          this._camera.position.z = Math.sin(a) * 180 - 125;
          let vector = new THREE.Vector3(-80, 0, -125);
          this._camera.lookAt(vector);

        } else if (this._threejs) {
          //collision detection (http://stemkoski.github.io/Three.js/Collision-Detection.html)
          for (var vertexIndex = 0; vertexIndex < this._cameraBox.geometry.vertices.length; vertexIndex++)
          {  
            var localVertex = this._cameraBox.geometry.vertices[vertexIndex].clone();
            var globalVertex = localVertex.applyMatrix4(this._cameraBox.matrix);
            var directionVector = globalVertex.sub( this._cameraBox.position );

            raycaster.set(this._cameraBox.position, directionVector.clone().normalize());
            var collisionResults = raycaster.intersectObjects( collidableMeshList );
            if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) 
            {
              this._camera.position.x = this._camera.position.x - (this._camera.position.x - collisionResults[0].point.x-5);
              this._camera.position.z = this._camera.position.z - (this._camera.position.z - collisionResults[0].point.z-5);
            }
          }
          this._cameraBox.position.x = this._camera.position.x;
          this._cameraBox.position.y = this._camera.position.y;
          this._cameraBox.position.z = this._camera.position.z;
          
          //checks if camera is out of bounds
          if (this._camera.position.x > 3190) {
            this._camera.position.x = 3190;
          } else if (this._camera.position.x < -3190) {
            this._camera.position.x = -3190;
          }
          if (this._camera.position.z > 3190) {
            this._camera.position.z = 3190;
          } else if (this._camera.position.z < -3190) {
            this._camera.position.z = -3190;
          }
          //update controls
          if (this._controls) {
            this._controls.update(clock.getDelta());
          }
          //move zombie to camera
          if (this._zombie) {
            var dist = Math.round(Math.sqrt(Math.pow(this._zombie.position.x - this._camera.position.x, 2) + Math.pow(this._zombie.position.z - this._camera.position.z, 2)))
            if (dist < 50) {//death
              //var lastscore = document.getElementById('score').innerHTML.replace("Score: ", "");
              var lastscore = getScore();
              document.body.replaceChildren();
              this._threejs = null;
              this._scene = null;
              this._camera = null;
              var distance = document.createElement('div');
              distance.id = 'death';
              document.body.appendChild(distance);
              distance.style.cssText = "position:fixed;top:40%;left:45%;cursor:default;opacity:0.9;z-index:0;font-size:4vw;font-family:'Brush Script MT',cursive;text-decoration:underline;color:red;";
              distance.innerText = 'You died!';

              var showscore = document.createElement('div');
              showscore.id = 'showscore';
              document.body.appendChild(showscore);
              showscore.style.cssText = "position:fixed;top:51%;left:45%;cursor:default;opacity:0.9;z-index:0;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
              showscore.innerText = 'Your score was: ' + lastscore;

              setScore(0);

              var playagain = document.createElement('div');
              playagain.id = 'playagain';
              document.body.appendChild(playagain);
              playagain.style.cssText = "position:fixed;top:55%;left:48%;cursor:pointer;opacity:0.9;z-index:0;font-size:2vw;font-family:'Brush Script MT',cursive;color:red;";
              playagain.innerText = 'Play Again';
              playagain.onclick = () => {
                document.body.replaceChildren();
                this._audio.pause();
                this._audio.currentTime = 0;
                this._InitialiseMenu();
              }
            }
            var currentscore = getScore();
            currentscore += 1;
            currentscore /= 10;
            if (this._zombie.position.x > this._camera.position.x) {
              //this._zombie.position.x -= timeElapsed*dist/divider;
              //this._zombie.position.x -= timeElapsed*dist/6;
              this._zombie.position.x -= timeElapsed*dist*currentscore;
            } else if (this._zombie.position.x < this._camera.position.x) {
              this._zombie.position.x += timeElapsed*dist*currentscore;
            }
            if (this._zombie.position.z > this._camera.position.z) {
              //this._zombie.position.z -= timeElapsed*dist/divider;
              this._zombie.position.z -= timeElapsed*dist*currentscore;
            } else if  (this._zombie.position.z < this._camera.position.z) {
              //this._zombie.position.z += timeElapsed*dist/divider;
              this._zombie.position.z += timeElapsed*dist*currentscore;
            }
            document.getElementById('distance').innerHTML = 'Zombie is ' + dist + ' units away from you.';
            //make zombie rotate z axis to always face camera
            this._zombie.rotation.z = -Math.atan2(this._camera.position.z - this._zombie.position.z, this._camera.position.x - this._zombie.position.x)+Math.PI/2;
          }
        }
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new ForestRangerGame();
});
