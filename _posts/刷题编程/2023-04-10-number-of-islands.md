---
layout: post
title: 200.Number of Islands
category: 刷题编程
tags: DFS, BFS, Union Find
description: graph的三种解法
---

这道题是一道经典的graph问题，用了DFS,BFS,Union Find三种思路去解，可以作为类似问题的模板.


### 原题地址

- [原题地址](https://leetcode.com/problems/number-of-islands/description/)
  
###  UNION FIND

```python
class Solution:
    def find(self, x):
        if self.root[x] == -1:           
            return x
        self.root[x] = self.find(self.root[x])
        return self.root[x]

    def union(self, x, y):
        RootX = self.find(x)
        RootY = self.find(y)
        if RootX != RootY:
            self.root[RootY] = RootX
            self.count -=1

    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or len(grid) == 0:
            return 0
        rows = len(grid)
        cols = len(grid[0])
        self.root = {}
        self.count = 0

        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == "1":
                    self.root[row*cols + col] = -1
                    self.count +=1

        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == "1":
                    #scan locations for 4 directions using tuple
                    for (r,c) in [(1,0),(0,1),(-1,0),(0,-1)]:
                        newrow = row + r
                        newcolumn = col + c
                        if  0 <= newrow <= rows-1 and 0 <= newcolumn <= cols-1 and grid[newrow][newcolumn] == "1":
                            self.union(row*cols+col , newrow*cols + newcolumn)
        return self.count
```

 

### DFS

```python
class Solution:
    def dfs(self,visited,grid,row,col):
        if  0 > row or self.rows <= row or 0 > col or self.cols <= col or grid[row][col] == "0" or visited[(row,col)]:
            return 
        visited[(row,col)] = True 
        #scan locations for 4 directions using tuple
        for (r,c) in [(1,0),(0,1),(-1,0),(0,-1)]:
            newrow = row + r
            newcolumn = col + c
            self.dfs(visited,grid,newrow,newcolumn)

    def numIslands(self, grid: List[List[str]]) -> int:  
        if not grid or len(grid) == 0:
            return 0
        self.rows = len(grid)
        self.cols = len(grid[0])    
        visited = collections.defaultdict(bool)
        count = 0
        for row in range(self.rows):
            for col in range(self.cols):
                if grid[row][col] == "1" and not visited[(row,col)]:
                    self.dfs(visited,grid, row, col)
                    count +=1
        return count

```

### BFS