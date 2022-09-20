
function tableCreate () {
  body = document.getElementById('controller');
  tbl = document.createElement('table');
  tbl.setAttribute('border', '0');
  tbdy = document.createElement('tbody');

  var tr = document.createElement('tr');
  td = document.createElement('td');
      btn = document.createElement('button');
      btn.className= "btn btn-basic board-btn";
      btn.id = 0;
      btn. onclick = function (event) {
        console.log('onclick 0');
        py = py -1;
        check_winning();        
        console.log(px, py, pz, zFar);
      }
      td.setAttribute("width","30px");
      td.appendChild(btn);
      tr.appendChild(td)
      tbdy.appendChild(tr);

    var tr = document.createElement('tr');

    for (let j = 1; j < 4; j++) {
      td = document.createElement('td');
      btn = document.createElement('button');
      btn.className= "btn btn-basic board-btn";
      btn.id = `${j}`;

      btn. onclick = function (event) {
        console.log('onclick '+j);
        if( j == 1){
          px = px +1;
          console.log(px, py, pz);
        }
        if( j == 2){
          py = py +1;
          console.log(px, py, pz);
        }
        if( j == 3){
          px = px -1;
          zoom = zoom -1;
          console.log(px, py, pz);
        }
        check_winning();
      }

      td.setAttribute("width","30px");
      td.appendChild(btn);
      tr.appendChild(td)
    }
    tbdy.appendChild(tr);
  // }

  ////////////////////////////////////////////////////

  var tr = document.createElement('tr');

    for (let j = 4; j < 6; j++) {
      td = document.createElement('td');
      btn = document.createElement('button');
      btn.className= "btn btn-basic board-btn";
      btn.id = `${j}`;

      btn. onclick = function (event) {
        console.log('onclick '+j);
        if( j == 4){
          fa = fa * Math.cos(30/180*Math.PI);
        }
        if( j == 5){
          fa = fa / Math.cos(30/180*Math.PI);
        }
        check_winning();
      }

      td.setAttribute("width","30px");
      td.appendChild(btn);
      tr.appendChild(td)
    }
    tbdy.appendChild(tr);

  /////////////////////////////////////////////////////////////


  tbl.appendChild(tbdy);
  body.appendChild(tbl);
}

function start () {
  starter = document.getElementsByClassName('starter')[0];
}


function check_winning () {
  console.log('camera',px,py,pz);
  console.log('red',redPosX,redPosY,redPosZ)
  console.log(radius/fa);
  console.log('result',Math.abs( Math.abs(px) - Math.abs(redPosX) ), Math.abs( Math.abs(py) - Math.abs(redPosY) ), Math.abs( Math.abs(pz) - Math.abs(redPosZ) ))
  // if(Math.abs( Math.abs(px) - Math.abs(redPosX) ) <=0.5 && Math.abs( Math.abs(py) - Math.abs(redPosY) ) <=0.9 && Math.abs( Math.abs(pz) - Math.abs(redPosZ) ) <=0.9){
    if(px <= -3 && px >= -5 && py>=3&& py<=7&& radius/fa <=3){
    alert("CONGRATULATIONS YOU FIND THE BIRD!!!!");
    disableScreen();
    px = 1000000;
  }

}


function disableScreen() {
    // creates <div class="overlay"></div> and 
    // adds it to the DOM
    var div= document.createElement("div");
    div.className += "overlay";
    document.body.appendChild(div);
}

// tableCreate()