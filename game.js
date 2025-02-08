document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const scoreDisplay = document.getElementById("score");

    // =========================
    //   パドル・ボール関係
    // =========================
    let x, y, dx, dy;
    const ballRadius = 8;

    const paddleHeight = 10;
    const paddleWidth = 75;
    let paddleX; 
    // パドルのY位置はキャンバス下から30px上
    const paddleY = canvas.height - paddleHeight - 30;

    let rightPressed = false;
    let leftPressed = false;
    let ballReleased = false;
    let spacePressed = false;
    let ballHold = false;
    let ballOffset = 0; // ホールド用: パドル左端との距離

    // ボール初期速度と打ち返し時係数
    const INITIAL_SPEED = 5;        
    const REFLECT_MULTIPLIER = 12;  

    // =========================
    //   スコア関連
    // =========================
    let score = 0;
    let highScore = localStorage.getItem("highScore")
        ? parseInt(localStorage.getItem("highScore"))
        : 0;

    // =========================
    //    ブロック配置用
    // =========================
    // 行数: 3～7、列数: 4～9 (ランダム)
    const rowCount = Math.floor(Math.random() * 5) + 3;  

    // ★ブロックのサイズ
    // ここで、最大9列並んでも枠内に収まる設定に
    const brickWidth = 50;   // 1ブロックの横幅
    const brickHeight = 25;  // 1ブロックの高さ
    const brickPadding = 3;  // ブロック間の間隔

    // 白枠を少し内側に描きたい→ 5pxほど余白
    const brickOffsetLeft = 5; 
    // 上側を少し空けてスコア表示と被らないように
    const brickOffsetTop = 60; 

    // ブロック情報を格納
    let bricks = [];

    // ランダム色を生成する関数
    function getRandomColor() {
        const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    // ランダム行数(rowCount)ごとに 列数(colCount:4〜9)を作る
    for (let r = 0; r < rowCount; r++) {
        const colCount = Math.floor(Math.random() * 6) + 4;
        bricks[r] = [];
        for (let c = 0; c < colCount; c++) {
            // 80%程度の確率でブロックを配置
            const status = Math.random() > 0.2 ? 1 : 0;
            const color = getRandomColor();
            bricks[r][c] = { x: 0, y: 0, status, color };
        }
    }

    function initGame() {
        paddleX = (canvas.width - paddleWidth) / 2;

        dx = INITIAL_SPEED;
        dy = -INITIAL_SPEED;

        // ボールをパドル中央やや上に
        x = paddleX + paddleWidth / 2;
        y = paddleY - ballRadius - 5;

        ballReleased = false;
        ballHold = false;
        spacePressed = false;

        score = 0;
        scoreDisplay.textContent = score;
    }

    // =========================
    //  キー操作
    // =========================
    function keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = true;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = true;
        } else if (e.code === "Space") {
            spacePressed = true;
            // ゲーム開始前なら発射
            if (!ballReleased) {
                ballReleased = true;
            }
        }
    }

    function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = false;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = false;
        } else if (e.code === "Space") {
            spacePressed = false;
            // ホールド中に離したら再発射
            if (ballHold) {
                ballHold = false;
                dy = -Math.abs(dy); 
            }
        }
    }

    document.addEventListener("keydown", keyDownHandler);
    document.addEventListener("keyup", keyUpHandler);

    // =========================
    //  背景・枠などの描画関数
    // =========================
    function drawBackground() {
        ctx.fillStyle = "darkblue";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function drawWhiteFrame() {
        ctx.save();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        let offset = 5; // 枠の余白
        ctx.beginPath();
        ctx.strokeRect(
            offset,
            offset,
            canvas.width - offset * 2,
            canvas.height - offset * 2
        );
        ctx.closePath();
        ctx.restore();
    }

    function drawStartMessage() {
        ctx.font = "20px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Press Space to Start", canvas.width / 2, canvas.height / 2);
    }

    // =========================
    //  スコア表示
    // =========================
    function drawHighScore() {
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "red";
        ctx.textAlign = "left";
        ctx.fillText(`HIGH SCORE: ${highScore}`, 20, 35);
    }

    // =========================
    //  ブロック衝突判定
    // =========================
    function collisionDetection() {
        for (let r = 0; r < bricks.length; r++) {
            for (let c = 0; c < bricks[r].length; c++) {
                const b = bricks[r][c];
                if (b.status === 1) {
                    if (
                        x > b.x &&
                        x < b.x + brickWidth &&
                        y > b.y &&
                        y < b.y + brickHeight
                    ) {
                        dy = -dy;
                        b.status = 0;
                        score += 100;
                        scoreDisplay.textContent = score;

                        if (score > highScore) {
                            highScore = score;
                            localStorage.setItem("highScore", highScore);
                        }
                    }
                }
            }
        }
    }

    // =========================
    //  ブロック全消し判定
    // =========================
    function allBricksCleared() {
        for (let r = 0; r < bricks.length; r++) {
            for (let c = 0; c < bricks[r].length; c++) {
                if (bricks[r][c].status === 1) {
                    return false;
                }
            }
        }
        return true; 
    }

    // =========================
    //  ボール・パドル描画
    // =========================
    function drawBall() {
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.fillStyle = "gray";
        ctx.fillRect(paddleX + 10, paddleY, paddleWidth - 20, paddleHeight);

        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(
            paddleX + 10,
            paddleY + paddleHeight / 2,
            paddleHeight / 2,
            Math.PI / 2,
            -Math.PI / 2,
            true
        );
        ctx.arc(
            paddleX + paddleWidth - 10,
            paddleY + paddleHeight / 2,
            paddleHeight / 2,
            -Math.PI / 2,
            Math.PI / 2,
            true
        );
        ctx.fill();

        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(paddleX + 10, paddleY, paddleWidth - 20, paddleHeight);
        ctx.closePath();
    }

    // 角丸長方形を描く (roundRectがあれば使う)
    function drawRoundRect(x, y, w, h, radius = 5) {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, radius);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + w - radius, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
            ctx.lineTo(x + w, y + h - radius);
            ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
    }

    function drawBricks() {
        for (let r = 0; r < bricks.length; r++) {
            for (let c = 0; c < bricks[r].length; c++) {
                const b = bricks[r][c];
                if (b.status === 1) {
                    const brickX = brickOffsetLeft + c * (brickWidth + brickPadding);
                    const brickY = brickOffsetTop + r * (brickHeight + brickPadding);
                    b.x = brickX;
                    b.y = brickY;

                    ctx.beginPath();
                    drawRoundRect(brickX, brickY, brickWidth, brickHeight, 5);
                    ctx.fillStyle = b.color;
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }

    // =========================
    //  メイン描画ループ
    // =========================
    function draw() {
        // 1) 背景をクリアし、暗い青で塗りつぶし
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();

        // 2) 白枠を描く
        drawWhiteFrame();

        // 3) スコア・ブロック・パドル・ボールを描画
        drawHighScore();
        drawBricks();
        drawPaddle();
        drawBall();

        // 4) ゲーム開始前 or ボール移動処理
        if (!ballReleased) {
            // ゲーム開始前、パドル上にボールを配置
            x = paddleX + paddleWidth / 2;
            y = paddleY - ballRadius - 5;
            drawStartMessage();
        } else {
            if (ballHold) {
                // ボールをホールド中 → パドル上に固定
                x = paddleX + ballOffset;
                y = paddleY - ballRadius - 5;
            } else {
                // 壁との衝突
                if (x + dx < ballRadius || x + dx > canvas.width - ballRadius) {
                    dx = -dx;
                }
                if (y + dy < ballRadius) {
                    dy = -dy;
                } else if (y + dy > canvas.height - ballRadius) {
                    // 下端を超えた → result.htmlへ
                    // ゲームオーバーなので
                    localStorage.setItem("lastScore", score);
                    // ★ resultType を "over" に
                    localStorage.setItem("resultType", "over");
                    window.location.href = "result.html";
                    return;
                }

                // パドルとの衝突
                if (
                    y + dy > paddleY - ballRadius &&
                    y + dy < paddleY + paddleHeight &&
                    x > paddleX &&
                    x < paddleX + paddleWidth
                ) {
                    if (spacePressed && dy > 0) {
                        // ホールド
                        ballHold = true;
                        ballOffset = x - paddleX;
                    } else {
                        // バウンド
                        dy = -dy;
                        let hitPoint = (x - paddleX) / paddleWidth - 0.5;
                        dx = hitPoint * REFLECT_MULTIPLIER;
                    }
                }

                // ブロック衝突判定
                collisionDetection();

                // ブロック全消し判定
                if (allBricksCleared()) {
                    // クリア時
                    localStorage.setItem("lastScore", score);
                    // ★ resultType を "clear" に
                    localStorage.setItem("resultType", "clear");
                    window.location.href = "result.html";
                    return;
                }

                // ボール座標更新
                x += dx;
                y += dy;
            }
        }

        // パドル移動
        if (rightPressed && paddleX < canvas.width - paddleWidth) {
            paddleX += 7;
        } else if (leftPressed && paddleX > 0) {
            paddleX -= 7;
        }

        requestAnimationFrame(draw);
    }

    initGame();
    draw();
});
