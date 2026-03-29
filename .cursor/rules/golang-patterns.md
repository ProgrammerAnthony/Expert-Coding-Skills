---
description: "Go 模式：在通用模式基础上补充函数式选项、小接口、依赖注入"
globs: ["**/*.go", "**/go.mod", "**/go.sum"]
alwaysApply: false
---
# Go 模式

> 在通用模式规则基础上，补充 Go 惯用法。

## 函数式选项（Functional Options）

```go
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server {
    s := &Server{port: 8080}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## 小接口

在使用方定义接口，而不是在实现方定义。

## 依赖注入

通过构造函数注入依赖：

```go
func NewUserService(repo UserRepository, logger Logger) *UserService {
    return &UserService{repo: repo, logger: logger}
}
```

## 延伸阅读

项目中若存在 **golang-patterns** 等技能，可结合并发、错误处理、包组织等专题一起使用。
