import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

import {OBJLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.3/examples/jsm/loaders/OBJLoader.js';
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

        const planetexture = new THREE.TextureLoader().load('./resources/ground.png');
        planetexture.wrapS = planetexture.wrapT = THREE.RepeatWrapping;
        planetexture.repeat.set( 640, 640 );
        planetexture.anisotropy = 16;
        planetexture.encoding = THREE.sRGBEncoding;
        var planeMaterial = new THREE.MeshStandardMaterial( { map: planetexture } );
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(640, 640, 10, 10),
            planeMaterial
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._menuscene.add(plane);

        const objLoader = new OBJLoader();
        objLoader.load('./resources/forest_house.obj', (root) => {
          this._menuscene.add(root);
          root.position.set(0, 0, 0);
          root.rotation.x = -Math.PI / 2;
          root.scale.set(10, 10, 10);
          this._camera.lookAt(root.position);
        });

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
          this._menuscene.add(trunk);
          this._menuscene.add(leaves);
        }
        
        
        //trunk.scale.set(20, (Math.random() + 2.0) * 100.0, 20);
        //leaves.scale.set(50, trunk.scale.y * 5.0, 50);


        this._menuscene.fog = new THREE.FogExp2(0xDFE9F3, 0.00055);
        this._totalTime = 0.0;
        this._previousRAF = null;
        this._RAF();
    }

    _InitialiseGame() {

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
        const far = /*1000.0*/5000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(75, 20, 0);

        this._scene = new THREE.Scene();


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
        this._scene.add(light);

        light = new THREE.AmbientLight(0x101010, 0.4);
        this._scene.add(light);

        const controls = new OrbitControls(this._camera, this._threejs.domElement);
          controls.target.set(0, 20, 0);
          controls.update();

        this._shaders = [];
        const _ModifyShader = (s) => {
            this._shaders.push(s);
            s.uniforms.fogTime = {value: 0.0};
        }
      

        /*const cloader = new THREE.CubeTextureLoader();
        const texture = cloader.load([
            './resources/px.png',
            './resources/nx.png',
            './resources/py.png',
            './resources/ny.png',
            './resources/pz.png',
            './resources/nz.png',
        ]);
        this._scene.background = texture;*/
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

        
        const planetexture = new THREE.TextureLoader().load('./resources/ground.png');
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

        /*const box = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({
                color: 0x532925,
            }));
          box.position.set(0, 1, 0);
          box.castShadow = true;
          box.receiveShadow = true;
          this._scene.add(box);
      
          for (let x = -8; x < 8; x++) {
            for (let y = -8; y < 8; y++) {
              const box = new THREE.Mesh(
                new THREE.BoxGeometry(2, 2, 2),
                new THREE.MeshStandardMaterial({
                    color: 0x808080,
                }));
              box.position.set(Math.random() + x * 5, Math.random() * 4.0 + 2.0, Math.random() + y * 5);
              box.castShadow = true;
              box.receiveShadow = true;
              this._scene.add(box);
            }
          }*/
        const trunkMat = new THREE.MeshStandardMaterial({color: 0x808080});
        const leavesMat = new THREE.MeshStandardMaterial({color: 0x80FF80});
        const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
        const leavesGeo = new THREE.ConeGeometry(1, 1, 32);
        trunkMat.onBeforeCompile = _ModifyShader;
        leavesMat.onBeforeCompile = _ModifyShader;
        for (let x = 0; x < 50; ++x) {
            for (let y = 0; y < 50; ++y) {
              const trunk = new THREE.Mesh(trunkGeo, trunkMat);
              const leaves = new THREE.Mesh(leavesGeo, leavesMat);
              trunk.scale.set(20, (Math.random() + 2.0) * 100.0, 20);
              trunk.position.set(
                  15000.0 * (Math.random() * 2.0 - 1.0),
                  trunk.scale.y / 2.0,
                  15000.0 * (Math.random() * 2.0 - 1.0));
      
              leaves.scale.copy(trunk.scale);
              leaves.scale.set(50, trunk.scale.y * 5.0, 50);
              leaves.position.set(
                  trunk.position.x,
                  leaves.scale.y / 2 + (Math.random() + 5) * 25,
                  trunk.position.z);
      
              this._scene.add(trunk);
              this._scene.add(leaves);
            }
          }
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
          if (this._previousRAF_ === null) {
            this._previousRAF = t;
          }
          this._Step((t - this._previousRAF) * 0.001);
          this._previousRAF = t;
          
          if (this._threejs) {
            this._threejs.render(this._scene, this._camera);
          } else if (this._threejsmenu) {
            this._threejsmenu.render(this._menuscene, this._camera);
            
            let vector = new THREE.Vector3(0, 0, 0);
            vector.applyQuaternion(this._camera.quaternion);
          }
          this._RAF();
        });
    }
    /*_RAF() {
        requestAnimationFrame(() => {
          this._threejs.render(this._scene, this._camera);
          this._RAF();
        });
      }*/

    _Step(timeElapsed) {
        this._totalTime += timeElapsed;
        for (let s of this._shaders) {
          s.uniforms.fogTime.value = this._totalTime;
        }
        //thanks to EliasFleckenstein03 (fleckenstein@elidragon.com) for this
        let a = this._totalTime * Math.PI * 2 * 0.005;
        this._camera.position.x = Math.cos(a) * 180 - 100;
        this._camera.position.z = Math.sin(a) * 180 - 125;
        let vector = new THREE.Vector3(-80, 0, -125);
        this._camera.lookAt(vector);
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new ForestRangerGame();
});