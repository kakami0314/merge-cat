// 合成西瓜游戏核心逻辑
// 需要配合 index.html 和 style.css 使用

const canvas = document.getElementById('gameCanvas');
// 自适应canvas宽高，最大320，2:3比例
function resizeCanvas() {
  const w = Math.min(window.innerWidth, 320);
  const h = w * 1.5;
  canvas.width = w;
  canvas.height = h;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
const ctx = canvas.getContext('2d');

const FRUITS = [
  { name: '爪爪', img: 'img/1.png', radius: 16, mass: 16*16 },
  { name: '小喵', img: 'img/2.png', radius: 22, mass: 22*22 },
  { name: '睡喵', img: 'img/3.png', radius: 28, mass: 28*28 },
  { name: '橘喵', img: 'img/4.png', radius: 34, mass: 34*34 },
  { name: '睡糕', img: 'img/5.png', radius: 40, mass: 40*40 },
  { name: '站糕', img: 'img/6.png', radius: 48, mass: 48*48 },
  { name: '当当', img: 'img/7.png', radius: 56, mass: 56*56 },
  { name: '阿呜', img: 'img/8.png', radius: 80, mass: 80*80 },
];

let fruits = [];
let currentFruit = null;
let score = 0;
let isGameOver = false;
let isDropping = false; // 新增变量，表示当前水果是否正在下落

function randomFruitIndex() {
  const r = Math.random();
  if (r < 0.5) return 0;      // 1级 50%
  if (r < 0.8) return 1;      // 2级 30%
  if (r < 0.95) return 2;     // 3级 15%
  return 3;                   // 4级 5%
  // 5级及以上不直接出现
}

function createFruit(x, y, type) {
  return {
    x,
    y,
    vx: 0, // 新增水平速度
    vy: 0,
    type,
    radius: FRUITS[type].radius,
    mass: FRUITS[type].mass,
    img: new Image(),
    merged: false,
  };
}

function spawnFruit() {
  const type = randomFruitIndex();
  // 让新水果x有微小随机偏移
  const baseX = canvas.width / 2;
  const offset = (Math.random() - 0.5) * canvas.width * 0.1; // 最大±5%宽度
  const fruit = createFruit(baseX + offset, 60, type);
  fruit.img.src = FRUITS[type].img;
  currentFruit = fruit;
  isDropping = false;
}

function drawFruit(fruit) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(fruit.img, fruit.x - fruit.radius, fruit.y - fruit.radius, fruit.radius * 2, fruit.radius * 2);
  ctx.restore();
  // 画细圆形边框
  ctx.save();
  ctx.beginPath();
  ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 画已落下的水果
  for (const fruit of fruits) {
    drawFruit(fruit);
  }
  // 画当前水果
  if (currentFruit) {
    drawFruit(currentFruit);
  }
  // 画分数
  ctx.fillStyle = '#000';
  ctx.font = '24px Arial';
  ctx.fillText('分数: ' + score, 20, 40);
  if (isGameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.fillText('游戏结束', canvas.width / 2 - 80, canvas.height / 2);
  }
}

function update() {
  if (isGameOver) return;
  // 让所有水果都受重力和摩擦影响
  for (const fruit of fruits) {
    fruit.vy += 0.3; // 重力
    fruit.x += fruit.vx;
    fruit.y += fruit.vy;
    fruit.vx *= 0.98;
    if (fruit.x - fruit.radius < 0) {
      fruit.x = fruit.radius;
      fruit.vx *= -0.5;
    }
    if (fruit.x + fruit.radius > canvas.width) {
      fruit.x = canvas.width - fruit.radius;
      fruit.vx *= -0.5;
    }
    if (fruit.y + fruit.radius > canvas.height) {
      fruit.y = canvas.height - fruit.radius;
      fruit.vy *= -0.15;
      if (Math.abs(fruit.vy) < 0.5) fruit.vy = 0;
    }
  }
  // 当前水果下落
  if (currentFruit && isDropping) {
    currentFruit.vy += 0.3;
    currentFruit.x += currentFruit.vx;
    currentFruit.y += currentFruit.vy;
    currentFruit.vx *= 0.98;
    let landed = false;
    // 地面
    if (currentFruit.y + currentFruit.radius > canvas.height) {
      currentFruit.y = canvas.height - currentFruit.radius;
      landed = true;
      currentFruit.vy *= -0.15;
    }
    // 与其他水果
    for (const fruit of fruits) {
      const dx = fruit.x - currentFruit.x;
      const dy = fruit.y - currentFruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = fruit.radius + currentFruit.radius;
      if (dist < minDist && dist > 0) {
        // 推开重叠
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        let totalMass = currentFruit.mass + fruit.mass;
        currentFruit.x -= nx * overlap * (fruit.mass / totalMass);
        currentFruit.y -= ny * overlap * (fruit.mass / totalMass);
        fruit.x += nx * overlap * (currentFruit.mass / totalMass);
        fruit.y += ny * overlap * (currentFruit.mass / totalMass);
        // 简单弹性碰撞速度交换
        let va = currentFruit.vx * nx + currentFruit.vy * ny;
        let vb = fruit.vx * nx + fruit.vy * ny;
        let vaAfter = (va * (currentFruit.mass - fruit.mass) + 2 * fruit.mass * vb) / totalMass;
        let vbAfter = (vb * (fruit.mass - currentFruit.mass) + 2 * currentFruit.mass * va) / totalMass;
        currentFruit.vx += (vaAfter - va) * nx;
        currentFruit.vy += (vaAfter - va) * ny;
        fruit.vx += (vbAfter - vb) * nx;
        fruit.vy += (vbAfter - vb) * ny;
        // 只要碰到就算落地
        landed = true;
      }
    }
    if (landed) {
      fruits.push(currentFruit);
      currentFruit = null;
      isDropping = false;
      spawnFruit(); // 立即生成新水果
    }
  }
  // 持续检测并立即合成所有可合成的水果
  let merged;
  do {
    merged = false;
    let allFruits = fruits.slice();
    if (currentFruit && isDropping) allFruits.push(currentFruit);
    outer: for (let i = 0; i < allFruits.length; i++) {
      for (let j = i + 1; j < allFruits.length; j++) {
        const a = allFruits[i];
        const b = allFruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (a.type === b.type && dist < minDist) {
          if (a.type < FRUITS.length - 1) {
            const newType = a.type + 1;
            const newFruit = createFruit((a.x + b.x) / 2, (a.y + b.y) / 2, newType);
            newFruit.img.src = FRUITS[newType].img;
            newFruit.vx = (a.vx + b.vx) / 2;
            newFruit.vy = (a.vy + b.vy) / 2;
            const removeFruit = (f) => {
              const idx = fruits.indexOf(f);
              if (idx !== -1) fruits.splice(idx, 1);
              if (currentFruit === f) {
                currentFruit = null;
                isDropping = false;
              }
            };
            removeFruit(a);
            removeFruit(b);
            fruits.push(newFruit);
            score += (newType + 1) * 10;
            merged = true;
            break outer;
          }
        }
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          let totalMass = a.mass + b.mass;
          a.x -= nx * overlap * (b.mass / totalMass);
          a.y -= ny * overlap * (b.mass / totalMass);
          b.x += nx * overlap * (a.mass / totalMass);
          b.y += ny * overlap * (a.mass / totalMass);
          let va = a.vx * nx + a.vy * ny;
          let vb = b.vx * nx + b.vy * ny;
          let vaAfter = (va * (a.mass - b.mass) + 2 * b.mass * vb) / totalMass;
          let vbAfter = (vb * (b.mass - a.mass) + 2 * a.mass * va) / totalMass;
          a.vx += (vaAfter - va) * nx;
          a.vy += (vaAfter - va) * ny;
          b.vx += (vbAfter - vb) * nx;
          b.vy += (vbAfter - vb) * ny;
        }
      }
      if (merged) break;
    }
    if (merged) return; // 本帧发生合成后直接return，下一帧再处理
  } while (merged);
  // 在update碰撞推开部分，每帧多次迭代推开所有球对
  for (let iter = 0; iter < 3; iter++) { // 每帧迭代3次
    let allFruits = fruits.slice();
    if (currentFruit && isDropping) allFruits.push(currentFruit);
    for (let i = 0; i < allFruits.length; i++) {
      for (let j = i + 1; j < allFruits.length; j++) {
        const a = allFruits[i];
        const b = allFruits[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          let totalMass = a.mass + b.mass;
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap * (b.mass / totalMass);
          a.y -= ny * overlap * (b.mass / totalMass);
          b.x += nx * overlap * (a.mass / totalMass);
          b.y += ny * overlap * (a.mass / totalMass);
          let va = a.vx * nx + a.vy * ny;
          let vb = b.vx * nx + b.vy * ny;
          let vaAfter = (va * (a.mass - b.mass) + 2 * b.mass * vb) / totalMass;
          let vbAfter = (vb * (b.mass - a.mass) + 2 * a.mass * va) / totalMass;
          a.vx += (vaAfter - va) * nx;
          a.vy += (vaAfter - va) * ny;
          b.vx += (vbAfter - vb) * nx;
          b.vy += (vbAfter - vb) * ny;
        }
      }
    }
  }
  // 合成后新球立即推开（在fruits.push(newFruit)后加一次推开）
  // 在合成逻辑后加：
  // for (const fruit of fruits) {
  //   if (fruit !== newFruit) {
  //     const dx = newFruit.x - fruit.x;
  //     const dy = newFruit.y - fruit.y;
  //     const dist = Math.sqrt(dx * dx + dy * dy);
  //     const minDist = newFruit.radius + fruit.radius;
  //     if (dist < minDist && dist > 0) {
  //       let totalMass = newFruit.mass + fruit.mass;
  //       const overlap = minDist - dist;
  //       const nx = dx / dist;
  //       const ny = dy / dist;
  //       newFruit.x += nx * overlap * (fruit.mass / totalMass);
  //       newFruit.y += ny * overlap * (fruit.mass / totalMass);
  //       fruit.x -= nx * overlap * (newFruit.mass / totalMass);
  //       fruit.y -= ny * overlap * (newFruit.mass / totalMass);
  //     }
  //   }
  // }
  // 检查顶部是否堆满（只判定vy很小的水果，且顶部超出2像素）
  for (const fruit of fruits) {
    if (fruit.y - fruit.radius <= 2 && Math.abs(fruit.vy) < 0.5) {
      isGameOver = true;
    }
  }
  // 统一在update末尾判断并生成新水果（每帧只生成一个）
  if (!currentFruit && !isGameOver) {
    spawnFruit();
  }
}

function updateScoreDisplay() {
  const scoreDiv = document.getElementById('score');
  if (scoreDiv) {
    scoreDiv.textContent = '分数：' + score;
  }
}

// 触摸滑动控制水果左右移动
canvas.addEventListener('touchmove', (e) => {
  if (currentFruit && !isGameOver && !isDropping) {
    const rect = canvas.getBoundingClientRect();
    let x = e.touches[0].clientX - rect.left;
    x = Math.max(currentFruit.radius, Math.min(canvas.width - currentFruit.radius, x));
    currentFruit.x = x;
    e.preventDefault();
  }
}, { passive: false });

// 鼠标点击和触摸松开时给vx一个微小随机值
canvas.addEventListener('click', () => {
  if (currentFruit && !isGameOver && !isDropping) {
    currentFruit.vy = 2;
    currentFruit.vx = (Math.random() - 0.5) * 1.5;
    isDropping = true;
  } else if (isGameOver) {
    fruits = [];
    score = 0;
    isGameOver = false;
    currentFruit = null;
    isDropping = false;
    spawnFruit();
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
  }
});
canvas.addEventListener('touchend', (e) => {
  if (currentFruit && !isGameOver && !isDropping) {
    currentFruit.vy = 2;
    currentFruit.vx = (Math.random() - 0.5) * 1.5;
    isDropping = true;
    e.preventDefault();
  } else if (isGameOver) {
    fruits = [];
    score = 0;
    isGameOver = false;
    currentFruit = null;
    isDropping = false;
    spawnFruit();
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    e.preventDefault();
  }
}, { passive: false });

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// 初始化
spawnFruit();
gameLoop();

// 给重新开始按钮添加事件
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    fruits = [];
    score = 0;
    isGameOver = false;
    currentFruit = null;
    isDropping = false;
    spawnFruit();
    updateScoreDisplay(); // 重新开始时也更新分数显示
  });
} 