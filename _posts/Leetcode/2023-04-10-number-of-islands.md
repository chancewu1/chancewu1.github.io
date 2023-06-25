---
layout: post
title: leetcode python 
category: Leetcode
tags: python, leetcode
description:
---

## Graph

### 200.Number of Islands

这道题是一道经典的graph问题，用了DFS,BFS,Union Find三种思路去解，可以作为类似问题的模板.

- [原题地址](https://leetcode.com/problems/number-of-islands/description/)
  
#### union find method

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

#### DFS method 

```python
class Solution:
    def dfs(self,grid,row,col):
        #recursive base case
        if  0 > row or self.rows <= row or 0 > col or self.cols <= col or grid[row][col] != "1":
            return 
        #initiate all none visited point
        grid[row][col] = '#'
        #scan locations for 4 directions using tuple
        for (r,c) in [(1,0),(0,1),(-1,0),(0,-1)]:
            newrow = row + r
            newcolumn = col + c
            self.dfs(grid,newrow,newcolumn)

    def numIslands(self, grid: List[List[str]]) -> int:  
        #edge case 
        if not grid or len(grid) == 0:
            return 0
        #tranverse all point in matrix
        self.rows = len(grid)
        self.cols = len(grid[0])    
        count = 0
        for row in range(self.rows):
            for col in range(self.cols):
        #countinue condition
                if grid[row][col] == "1":
                    self.dfs(grid, row, col)
                    count +=1
        return count
``` 
#### BFS

```py
class Solution(object):

    def bfs(self, grid, r, c):
        queue = collections.deque()
        queue.append((r, c))
        while queue:
            v_row, v_col = queue.popleft()
            if self.m <= v_row or v_row < 0 or self.n <= v_col or v_col < 0 or grid[v_row][v_col] != '1':
                continue
            grid[v_row][v_col] = '#'
            for (row,col) in [(0,1),(0,-1),(-1,0),(1,0)]:
                newrow = v_row + row
                newcol = v_col + col
                queue.append((newrow, newcol))
         
    def numIslands(self, grid):
        if not grid or not grid[0]:
            return 0
        self.m, self.n = len(grid), len(grid[0])
        count = 0
        for row in range(self.m):
            for col in range(self.n):
                if grid[row][col] == '1':
                    self.bfs(grid, row, col)
                    count += 1
        return count

                            
```
### 690. Employee Importance

- [原题地址](https://leetcode.com/problems/employee-importance/)

这道题可以用哈希表解决

```py

class Employee(object):
    def __init__(self, id, importance, subordinates):
    	 """
        :type id: int
        :type importance: int
        :type subordinates: List[int]
         """
        self.id = id
        self.importance = importance
        self.subordinates = subordinates

class Solution(object):

    def getImportance(self, employees, id):
        """
        :type employees: List[Employee]
        :type id: int
        :rtype: int
        """
   
        emap = {e.id:e for e in employees}
        def dfs(e):
            imp = emap[e].importance
            for s in emap[e].subordinates:
                imp += dfs(s)
            return imp
        return dfs(id)
```