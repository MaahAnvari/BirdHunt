const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;

  out vec3 v_normal;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
  }
`;

const fs = `#version 300 es
  precision highp float;

  in vec3 v_normal;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;

  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    outColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
  }
`;


var zNear;
var zFar;

var radius;

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 100]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

  //Parameters for Camera
var cx = 0.5;
var cy = 0.0;
var cz = 0.0;
var px = 0.5;
var py = 0.0;
var pz = 0.0;
var elevation = 0.01;
var angle = 0.01;
var roll = 0.01;
var zoom = 1;

var redPosX;
var redPosY;
var redPosZ;


var lookRadius = 90.0;

const keys = {};

var vx = 0.0;
var vy = 0.0;
var vz = 0.0;
var rvx = 0.0;
var rvy = 0.0;
var rvz = 0.0;

var fa = 1.5;


// texture loader callback
var textureLoaderCallback = function() {
	var textureId = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + this.txNum);
	gl.bindTexture(gl.TEXTURE_2D, textureId);		
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);		
// set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}



 
function main() {

  var canvas = document.getElementById("game-canvas");
	try{
		gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
	}

  // Tell the twgl to match position with a_position etc..
  twgl.setAttributePrefix("a_");


  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  // const baseObj = parseOBJ(baseObjStr);
  const baseObj = parseOBJ(tree1ObjStr);
  const tree1Obj = parseOBJ(tree1ObjStr);
  const redObj = parseOBJ(redObjStr);
  const rock1Obj = parseOBJ(rock1ObjStr);
  const flowerObj = parseOBJ(flowerObjStr);

    /*The z-buffering technique splits the primitives at the pixel level
    This technique requires a special memory area that stores 
    additional information for every pixel on the screen, which is 
    called the z-buffer*/
  const baseParts = baseObj.geometries.map(({data}) => {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [0.2, 0.8, 0.1, 1],
      },
      bufferInfo,
      vao,
    };
  });
  const redParts = redObj.geometries.map(({data}) => {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [0, 1, 0, 1],
      },
      bufferInfo,
      vao,
    };
  });
  const tree1Parts = tree1Obj.geometries.map(({data}) => {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [0, 0.8, 0, 1],
      },
      bufferInfo,
      vao,
    };
  });
  const rock1Parts = rock1Obj.geometries.map(({data}) => {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [0, 1, 0, 1],
      },
      bufferInfo,
      vao,
    };
  });
  const flowerParts = flowerObj.geometries.map(({data}) => {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [1, 0, 0, 1],
      },
      bufferInfo,
      vao,
    };
  });

  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

  function getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }

  const baseExtents = getGeometriesExtents(baseObj.geometries);
  const baseRange = m4.subtractVectors(baseExtents.max, baseExtents.min);

  // amount to move the object so its center is at the origin

  const baseObjOffset = m4.scaleVector(m4.addVectors(baseExtents.min, m4.scaleVector(baseRange, 1)), -1);

  var cameraTarget = [0,0,0];
  // figure out how far away to move the camera so we can likely
  // see the object.

  radius = m4.length(baseRange) * 1;
  var cameraPosition = m4.subtractVectors(cameraTarget, [
    cx,
    cy,
    radius*1.5,
    zoom
  ]);


  
  const redExtents = getGeometriesExtents(redObj.geometries);
  const redRange = m4.subtractVectors(redExtents.max, redExtents.min);
  
  const tree1Extents = getGeometriesExtents(tree1Obj.geometries);
  const tree1Range = m4.subtractVectors(tree1Extents.max, tree1Extents.min);
  
  const rock1Extents = getGeometriesExtents(rock1Obj.geometries);
  const rock1Range = m4.subtractVectors(rock1Extents.max, rock1Extents.min);
  
  const flowerExtents = getGeometriesExtents(flowerObj.geometries);
  const flowerRange = m4.subtractVectors(flowerExtents.max, flowerExtents.min);


  // Set zNear and zFar to something hopefully appropriate
  // for the size of this object.
  zNear = radius / 100;
  zFar = radius * 10;

  
  function render() {

    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = utils.degToRad(30);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    

    
    cameraTarget = [px,py,pz];
    cameraPosition = m4.addVectors(cameraTarget, [
      cx,
      cy,
      radius/fa,
      zoom
    ]);
    
    /*the camera oriented with the y-axis perpendicular 
      to the horizon.*/
    const up = [0, 1, 0];

    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(cameraPosition, cameraTarget, up);

    //Normalize it
    m4.multiply(camera, m4.xRotation(0.2));
    
    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

/*Back-face culling can exclude the faces that belong to the 
backside of a mesh simply by checking whether triangle 
vertices are ordered clockwise or counterclockwise.
 back-face culling in normalized screen coordinates*/

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    // compute the world matrix once since all parts
    // are at the same space.
        /*The World Matrix Mw transforms the local coordinates into the 
          corresponding global ones*/
    let u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...baseObjOffset);

    for (const {bufferInfo, vao, material} of baseParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    redPosX = redExtents.min[0]-0.6;
    redPosY = redExtents.min[1]+1.3;
    redPosZ = redExtents.min[2]-0.5;
    const redObjOffset = m4.scaleVector([redPosX, redPosY, redPosZ],6);
    const tree1ObjOffset1 = m4.scaleVector([tree1Extents.min[0], tree1Extents.min[1]+1, tree1Extents.min[2]],10);
    const tree1ObjOffset2 = m4.scaleVector([tree1Extents.min[0], tree1Extents.min[1]+1, tree1Extents.min[2]],5);
    const tree1ObjOffset3 = m4.scaleVector([tree1Extents.min[0]-0.9, tree1Extents.min[1]+1, tree1Extents.min[2]+2.1],4);
    const tree1ObjOffset4 = m4.scaleVector([tree1Extents.min[0]+0.3, tree1Extents.min[1]+1, tree1Extents.min[2]-0.4],6);
    const tree1ObjOffset5 = m4.scaleVector([tree1Extents.min[0]+0.6, tree1Extents.min[1]-1, tree1Extents.min[2]],6);
    const tree1ObjOffset6 = m4.scaleVector([tree1Extents.min[0]+1, tree1Extents.min[1]+1, tree1Extents.min[2]]+1,6);
    const tree1ObjOffset7 = m4.scaleVector([tree1Extents.min[0]+0.6, tree1Extents.min[1]+1.2, tree1Extents.min[2]-0.3],6);
    const tree1ObjOffset8 = m4.scaleVector([tree1Extents.min[0]+0.9, tree1Extents.min[1]+1, tree1Extents.min[2]+0.4],6);
    const tree1ObjOffset9 = m4.scaleVector([tree1Extents.min[0]-0.7, tree1Extents.min[1]-2, tree1Extents.min[2]+0.5],6);
    const tree1ObjOffset10 = m4.scaleVector([tree1Extents.min[0]+1, tree1Extents.min[1]+3, tree1Extents.min[2]-2],6);
    const tree1ObjOffset11 = m4.scaleVector([tree1Extents.min[0]-2, tree1Extents.min[1]+1, tree1Extents.min[2]+9],3);
    const tree1ObjOffset12 = m4.scaleVector([tree1Extents.min[0]+2, tree1Extents.min[1]-0.5, tree1Extents.min[2]-1],6);
    const tree1ObjOffset13 = m4.scaleVector([tree1Extents.min[0]+1, tree1Extents.min[1]+0.1, tree1Extents.min[2]],6);
    const tree1ObjOffset14 = m4.scaleVector([tree1Extents.min[0]+1.5, tree1Extents.min[1]+0.2, tree1Extents.min[2]-0.5],6);
    const rock1ObjOffset  = m4.addVectors([(rock1Extents.min[0]-10) * Math.cos(30/180*Math.PI), (rock1Extents.min[1]-10) * Math.cos(30/180*Math.PI), rock1Extents.min[2]],[rock1Range[0] -25, rock1Range[1], 1]);
    const rock1ObjOffset1 = m4.addVectors([(rock1Extents.min[0]) * Math.cos(50/180*Math.PI), (rock1Extents.min[1]-10) * Math.cos(60/180*Math.PI)-20, rock1Extents.min[2]],[rock1Range[0] +10, rock1Range[1], 1]);
    const rock1ObjOffset2 = m4.addVectors([(rock1Extents.min[0]-10) * Math.cos(90/180*Math.PI), (rock1Extents.min[1]) * Math.cos(90/180*Math.PI), rock1Extents.min[2]],[rock1Range[0] -25, rock1Range[1], 1]);
    const flowerObjOffset  = m4.addVectors([flowerExtents.min[0], flowerExtents.min[1]*Math.cos(30/180*Math.PI)+1, flowerExtents.min[2]+8],[flowerRange[0] + 2, flowerRange[1] , 4]);
    const flowerObjOffset1 = m4.addVectors([flowerExtents.min[0]-14, flowerExtents.min[1]*Math.cos(30/180*Math.PI)-6, flowerExtents.min[2]-25],[flowerRange[0] + 2, flowerRange[1] , 4]);
    const flowerObjOffset2 = m4.addVectors([flowerExtents.min[0]+2, flowerExtents.min[1]*Math.cos(30/180*Math.PI)-8, flowerExtents.min[2]],[flowerRange[0] + 2, flowerRange[1] , 4]);
    const flowerObjOffset3 = m4.addVectors([flowerExtents.min[0]+5, flowerExtents.min[1]*Math.cos(30/180*Math.PI)-10, flowerExtents.min[2]-4],[flowerRange[0] + 2, flowerRange[1] , 4]);
    const flowerObjOffset4 = m4.addVectors([flowerExtents.min[0]-8, flowerExtents.min[1]*Math.cos(30/180*Math.PI)+2, flowerExtents.min[2]+1],[flowerRange[0] + 2, flowerRange[1] , 4]);
    const flowerObjOffset5 = m4.addVectors([flowerExtents.min[0]-1, flowerExtents.min[1]*Math.cos(30/180*Math.PI)+5, flowerExtents.min[2]]+2,[flowerRange[0] + 2, flowerRange[1] , 4]);

    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...redObjOffset);

    for (const {bufferInfo, vao, material} of redParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [1,0.2,0.2,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
        }
      /////////////TREE1 OBJ////////////////////////////////////////    
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset1);
    for (const {bufferInfo, vao, material} of tree1Parts) {
    // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {
      u_world,
      u_diffuse: [0.1,0.8,0.2,1],
      });
      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, bufferInfo);
    }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset2);
    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0,0.8,0.2,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
        }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset3);
    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world, u_diffuse: [0,0.8,0.1,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
        }

    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset4);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.8,0.2,0.8],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset5);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.8,0.2,0.8],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset6);
    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.8,0.2,0.8],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset7);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.4,0.2,0.8],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset8);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.5,0.2,0.9],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset9);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0,0.7,0.2,0.8],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset10);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.7,0.1,0.9],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset11);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.2,0.7,0.1,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset12);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.1,0.6,0.2,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset13);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0,0.5,0.2,1],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...tree1ObjOffset14);

    for (const {bufferInfo, vao, material} of tree1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.1,0.6,0.1,0.9],});
         // calls gl.drawArrays or gl.drawElements
         twgl.drawBufferInfo(gl, bufferInfo);
      }

      /////////////////////////////////////////////////////
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...rock1ObjOffset);

    for (const {bufferInfo, vao, material} of rock1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.1,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...rock1ObjOffset1);

    for (const {bufferInfo, vao, material} of rock1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0,0,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...rock1ObjOffset2);

    for (const {bufferInfo, vao, material} of rock1Parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0,0,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
      /////////////////////////////////////////////////////
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset1);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset2);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset3);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset4);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
    u_world = utils.identityMatrix()
    u_world = m4.translate(u_world, ...flowerObjOffset5);

    for (const {bufferInfo, vao, material} of flowerParts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {u_world,u_diffuse: [0.3,0.2,0.5,0.8],});
   // calls gl.drawArrays or gl.drawElements
   twgl.drawBufferInfo(gl, bufferInfo);
  }
      /////////////////////////////////////////////////////

      if (keys['37']) {   //left
        console.log('37')
        // ang += deltaTime * turnSpeed * direction;
        px = px -0.1;
        check_winning(); 
      }
    
      if (keys['38']) { //up

        console.log('38');
        py = py +0.1;
        check_winning(); 
      }
      if (keys['39']) { //right
        console.log('39')
        px = px +0.1;
        check_winning(); 
      }
    
      if (keys['40']) { //down
        console.log('40')
        py = py -0.1;
        check_winning(); 
      }
      if (keys['87']) { //w
        console.log('87')
        fa = fa / Math.cos(30/180/6*Math.PI);
        check_winning(); 
      }
      if (keys['83']) { //s
        console.log('83')
        fa = fa * Math.cos(30/180/6*Math.PI);
        check_winning(); 
      }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

window.onload = main;

window.addEventListener('keydown', (e) => {
  keys[e.keyCode] = true;
  e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  keys[e.keyCode] = false;
  e.preventDefault();
});

