//edited version of https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/FirstPersonControls.js (MIT license)
import {
	MathUtils,
	Spherical,
	Vector3,
	Raycaster,
	Geometry,
	PointsMaterial,
	Vertex,
	Points
} from 'https://cdn.jsdelivr.net/npm/three@0.118.3/build/three.module.js';

const _lookDirection = new Vector3();
const _spherical = new Spherical();
const _target = new Vector3();
var score = 0;
var lastShoot = 3;

function getRandomArbitrary(min, max) {
	return Math.random() * (max - min) + min;
}

function setScore(setscore) {
	score = setscore;
}
function getScore() {
	return score;
}

class FirstPersonControls {

	constructor( object, domElement, zombie, scene ) {

		if ( domElement === undefined ) {

			console.warn( 'THREE.FirstPersonControls: The second parameter "domElement" is now mandatory.' );
			domElement = document;

		}

		this.object = object;
		this.domElement = domElement;

		// API
		this.enabled = true;

		this.movementSpeed = 1.0;
		this.lookSpeed = 0.005;

		this.lookVertical = false;
		this.autoForward = false;

		this.activeLook = true;

		this.heightSpeed = true;
		this.heightCoef = 1.0;
		this.heightMin = 0.0;
		this.heightMax = 0.0;

		this.constrainVertical = true;
		this.verticalMin = Math.PI/2;
		this.verticalMax = Math.PI/2;

		this.mouseDragOn = false;

		// internals

		this.autoSpeedFactor = 0.0;

		this.mouseX = 0;
		this.mouseY = 0;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;
		this.mainMouse = false;

		this.viewHalfX = 0;
		this.viewHalfY = 0;

		// private variables

		let lat = 0;
		let lon = 0;

		//

		this.handleResize = function () {

			if ( this.domElement === document ) {

				this.viewHalfX = window.innerWidth / 2;
				this.viewHalfY = window.innerHeight / 2;

			} else {

				this.viewHalfX = this.domElement.offsetWidth / 2;
				this.viewHalfY = this.domElement.offsetHeight / 2;

			}

		};
		this.onMouseDown = function ( event ) {
			if ( this.domElement !== document ) {

				this.domElement.focus();

			}

			if ( this.activeLook ) {

				switch ( event.button ) {

					case 0: /*this.moveForward = true;*/ this.mainMouse = true; break;
					case 2: /*this.moveBackward = true;*/ break;

				}

			}

			this.mouseDragOn = true;

		};

		this.onMouseUp = function ( event ) {

			if ( this.activeLook ) {

				switch ( event.button ) {

					case 0: /*this.moveForward = false;*/ this.mainMouse = false; break;
					case 2: /*this.moveBackward = false;*/ break;

				}

			}

			this.mouseDragOn = false;

		};
		this.onMouseMove = function ( event ) {

			if ( this.domElement === document) {

				this.mouseX = event.pageX - this.viewHalfX;
				this.mouseY = event.pageY - this.viewHalfY;

			} else {

				this.mouseX = event.pageX - this.domElement.offsetLeft - this.viewHalfX;
				this.mouseY = event.pageY - this.domElement.offsetTop - this.viewHalfY;

			}

		};

		this.onKeyDown = function ( event ) {

			switch ( event.code ) {

				case 'ArrowUp':
				case 'KeyW': this.moveForward = true; break;

				case 'ArrowLeft':
				case 'KeyA': this.moveLeft = true; break;

				case 'ArrowDown':
				case 'KeyS': this.moveBackward = true; break;

				case 'ArrowRight':
				case 'KeyD': this.moveRight = true; break;

				case 'KeyE': this.shoot = true; break;

				//case 'KeyR': this.moveUp = true; break;
				//case 'KeyF': this.moveDown = true; break;

			}

		};

		this.onKeyUp = function ( event ) {

			switch ( event.code ) {

				case 'ArrowUp':
				case 'KeyW': this.moveForward = false; break;

				case 'ArrowLeft':
				case 'KeyA': this.moveLeft = false; break;

				case 'ArrowDown':
				case 'KeyS': this.moveBackward = false; break;

				case 'ArrowRight':
				case 'KeyD': this.moveRight = false; break;

				case 'KeyE': this.shoot = false; break;

				//case 'KeyR': this.moveUp = false; break;
				//case 'KeyF': this.moveDown = false; break;

			}

		};

		this.lookAt = function ( x, y, z ) {

			if ( x.isVector3 ) {

				_target.copy( x );

			} else {

				_target.set( x, y, z );

			}

			this.object.lookAt( _target );

			setOrientation( this );

			return this;

		};

		this.update = function () {

			var targetPosition = new Vector3();

			return function update( delta ) {

				if ( this.enabled === false ) return;

				if ( this.heightSpeed ) {

					const y = MathUtils.clamp( this.object.position.y, this.heightMin, this.heightMax );
					const heightDelta = y - this.heightMin;

					this.autoSpeedFactor = delta * ( heightDelta * this.heightCoef );

				} else {

					this.autoSpeedFactor = 0.0;

				}

				const actualMoveSpeed = delta * this.movementSpeed;

				if ( this.moveForward || ( this.autoForward && ! this.moveBackward ) ) this.object.translateZ( - ( actualMoveSpeed + this.autoSpeedFactor ) );
				if ( this.moveBackward ) this.object.translateZ( actualMoveSpeed );

				if ( this.moveLeft ) this.object.translateX( - actualMoveSpeed );
				if ( this.moveRight ) this.object.translateX( actualMoveSpeed );

				if ( this.moveUp ) this.object.translateY( actualMoveSpeed );
				if ( this.moveDown ) this.object.translateY( - actualMoveSpeed );

				let actualLookSpeed = delta * this.lookSpeed;

				if ( ! this.activeLook ) {

					actualLookSpeed = 0;

				} else if (!this.mainMouse) {
					actualLookSpeed = 0;
				}

				let verticalLookRatio = 1;

				if ( this.constrainVertical ) {

					verticalLookRatio = Math.PI / ( this.verticalMax - this.verticalMin );

				}

				lon -= this.mouseX * actualLookSpeed;
				if ( this.lookVertical ) lat -= this.mouseY * actualLookSpeed * vertica;

				lat = Math.max( - 85, Math.min( 85, lat ) );

				let phi = MathUtils.degToRad( 90 - lat );
				const theta = MathUtils.degToRad( lon );

				if ( this.constrainVertical ) {

					phi = MathUtils.mapLinear( phi, 0, Math.PI, this.verticalMin, this.verticalMax );

				}

				const position = this.object.position;

				targetPosition.setFromSphericalCoords( 1, phi, theta ).add( position );

				this.object.lookAt( targetPosition );

				if (lastShoot > 3) {
					document.body.childNodes[3].innerHTML = "Your gun is loaded.";
				} else {
					document.body.childNodes[3].innerHTML = "Loading your gun... " + Math.round(lastShoot / 3 * 100) + "%";
				}

				if (this.shoot && lastShoot > 3) {
					var raycaster = new Raycaster();
					var cameraDir = new Vector3();
					raycaster.set(this.object.position, this.object.getWorldDirection(cameraDir));

					var intersects = raycaster.intersectObjects(scene.children, true);
					if (intersects.length > 0) {
						var audio = new Audio('./resources/gunshot.mp3');
						audio.play();
						
						if (intersects[0].object.name == "cameraBox") {
							if (intersects[1].object.name == "zombie") {
								var audio = new Audio('./resources/ding.mp3');
								audio.play();
								//score += 1;
								setScore(score + 1);
								document.body.childNodes[0].innerHTML = "Score: " + score;
								zombie.position.x = getRandomArbitrary(-3200, 3200);
								zombie.position.z = getRandomArbitrary(-3200, 3200);
								
								var particles = new Geometry(),
    							pMaterial = new PointsMaterial({color: 0xFFFF00, size: 5});

								// create a particle
								var particle = intersects[1].point;
					  
								// add it to the geometry
								particles.vertices.push(particle);
					  		
								var particleSystem = new Points(particles, pMaterial);
					
								scene.add(particleSystem);

								var bParticles = new Geometry(),
								bMaterial = new PointsMaterial({color: 0xFF0000, size: 5});
								
								for (let i=0; i<5; i++) {
									var px = getRandomArbitrary(-10, 10)+intersects[1].point.x,
									py = getRandomArbitrary(-10, 10)+intersects[1].point.y,
									pz = getRandomArbitrary(-10, 10)+intersects[1].point.z,
									bParticle = new Vector3(px, py, pz);

									bParticles.vertices.push(bParticle);
								}
								var bParticleSystem = new Points(bParticles, bMaterial);
								scene.add(bParticleSystem);
								document.body.childNodes[2].innerHTML = "Hit!";
								setTimeout(function() {
									document.body.childNodes[2].innerHTML = "";
									scene.remove(particleSystem);
									scene.remove(bParticleSystem);
								}, 1000);
							}
						} else if (intersects[0].object.name == "zombie") {
							var audio = new Audio('./resources/ding.mp3');
							audio.play();
							//score += 1;
							setScore(score + 1);
							document.body.childNodes[0].innerHTML = "Score: " + score;
							zombie.position.x = getRandomArbitrary(-3200, 3200);
							zombie.position.z = getRandomArbitrary(-3200, 3200);

							var particles = new Geometry(),
    						pMaterial = new PointsMaterial({color: 0xFFFF00, size: 5});

							// create a particle
							var particle = intersects[0].point;
					  
							// add it to the geometry
							particles.vertices.push(particle);
					  		
							var particleSystem = new Points(particles, pMaterial);
					
							scene.add(particleSystem);

							var bParticles = new Geometry(),
							bMaterial = new PointsMaterial({color: 0xFF0000, size: 5});
								
							for (let i=0; i<10; i++) {
								var px = getRandomArbitrary(-10, 10)+intersects[0].point.x,
								py = getRandomArbitrary(-10, 10)+intersects[0].point.y,
								pz = getRandomArbitrary(-10, 10)+intersects[0].point.z,
								bParticle = new Vector3(px, py, pz);

								bParticles.vertices.push(bParticle);
							}
							var bParticleSystem = new Points(bParticles, bMaterial);
							scene.add(bParticleSystem);

							document.body.childNodes[2].innerHTML = "Hit!";
							setTimeout(function() {
								document.body.childNodes[2].innerHTML = "";
								scene.remove(particleSystem);
								scene.remove(bParticleSystem);
							}, 1000);
							
						} else {
							var particles = new Geometry(),
    							pMaterial = new PointsMaterial({color: 0xFFFF00, size: 5});

								// create a particle
								var particle = intersects[0].point;
					  
								// add it to the geometry
								particles.vertices.push(particle);
					  		
								var particleSystem = new Points(particles, pMaterial);
					
								scene.add(particleSystem);
								setTimeout(() => {
									scene.remove(particleSystem);
								}, 60000);
						}
					}
					this.shoot = false;
					lastShoot = 0;
				} else {
					lastShoot += delta;
				}
			};

		}();

		this.dispose = function () {

			this.domElement.removeEventListener( 'contextmenu', contextmenu );
			this.domElement.removeEventListener( 'mousedown', _onMouseDown );
			this.domElement.removeEventListener( 'mousemove', _onMouseMove );
			this.domElement.removeEventListener( 'mouseup', _onMouseUp );

			window.removeEventListener( 'keydown', _onKeyDown );
			window.removeEventListener( 'keyup', _onKeyUp );

		};

		const _onMouseMove = this.onMouseMove.bind( this );
		const _onMouseDown = this.onMouseDown.bind( this );
		const _onMouseUp = this.onMouseUp.bind( this );
		const _onKeyDown = this.onKeyDown.bind( this );
		const _onKeyUp = this.onKeyUp.bind( this );

		this.domElement.addEventListener( 'contextmenu', contextmenu );
		this.domElement.addEventListener( 'mousemove', _onMouseMove );
		this.domElement.addEventListener( 'mousedown', _onMouseDown );
		this.domElement.addEventListener( 'mouseup', _onMouseUp );

		window.addEventListener( 'keydown', _onKeyDown );
		window.addEventListener( 'keyup', _onKeyUp );

		function setOrientation( controls ) {

			const quaternion = controls.object.quaternion;

			_lookDirection.set( 0, 0, - 1 ).applyQuaternion( quaternion );
			_spherical.setFromVector3( _lookDirection );

			lat = 90 - MathUtils.radToDeg( _spherical.phi );
			lon = MathUtils.radToDeg( _spherical.theta );

		}

		this.handleResize();

		setOrientation( this );

	}

}

function contextmenu( event ) {

	event.preventDefault();

}

export { FirstPersonControls, setScore, getScore };